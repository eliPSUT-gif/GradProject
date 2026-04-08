import type { VercelRequest, VercelResponse } from '@vercel/node';

const MIN_RECAPTCHA_SCORE = 0.5;
const VERIFY_TIMEOUT_MS = 8000;
const RECAPTCHA_VERIFY_URL = 'https://www.recaptcha.net/recaptcha/api/siteverify';
const PRODUCTION_HOSTS = new Set([
  'grad-project-one.vercel.app',
]);

function timeoutAfter<T>(ms: number, response: T) {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(response), ms);
  });
}

function normalizeAction(action: string | undefined) {
  return action?.trim().toLowerCase() ?? '';
}

export const config = {
  maxDuration: 10,
};

function isTestingDeployment(request: VercelRequest) {
  const vercelEnv = (process.env.VERCEL_ENV ?? '').trim().toLowerCase();
  const gitRef = (process.env.VERCEL_GIT_COMMIT_REF ?? '').trim().toLowerCase();
  const host = String(request.headers.host ?? '').trim().toLowerCase();
  const deploymentUrl = String(request.headers['x-vercel-deployment-url'] ?? '').trim().toLowerCase();

  if (vercelEnv === 'preview') {
    return true;
  }

  if (gitRef && gitRef !== 'main' && gitRef !== 'master') {
    return true;
  }

  if (deploymentUrl && deploymentUrl !== 'grad-project-one.vercel.app') {
    return true;
  }

  return host.length > 0 && !PRODUCTION_HOSTS.has(host);
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.status(405).json({ success: false, error: 'Method not allowed.' });
    return;
  }

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  const isPreviewDeployment = isTestingDeployment(request);
  if (!secret) {
    response.status(500).json({ success: false, error: 'reCAPTCHA secret key is not configured.' });
    return;
  }

  const payload = typeof request.body === 'string'
    ? JSON.parse(request.body) as { token?: string; action?: string }
    : (request.body ?? {}) as { token?: string; action?: string };

  if (!payload.token || !payload.action) {
    response.status(400).json({ success: false, error: 'Missing reCAPTCHA token or action.' });
    return;
  }

  if (isPreviewDeployment) {
    response.status(200).json({
      success: true,
      score: 1,
      action: payload.action,
      bypassed: true,
    });
    return;
  }

  const verificationBody = new URLSearchParams({
    secret,
    response: payload.token,
  });

  try {
    const googleResult = await Promise.race([
      fetch(RECAPTCHA_VERIFY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: verificationBody.toString(),
      }).then(async (googleResponse) => {
        if (!googleResponse.ok) {
          throw new Error(`Google verification failed with status ${googleResponse.status}.`);
        }

        return (await googleResponse.json()) as {
          success?: boolean;
          score?: number;
          action?: string;
          ['error-codes']?: string[];
        };
      }),
      timeoutAfter(VERIFY_TIMEOUT_MS, {
        success: false,
        score: 0,
        action: payload.action,
        ['error-codes']: ['verification-timeout'],
      }),
    ]);

    const score = Number(googleResult.score ?? 0);
    const expectedAction = normalizeAction(payload.action);
    const returnedAction = normalizeAction(googleResult.action);
    const hasReturnedAction = returnedAction.length > 0;
    const isActionMatch = !hasReturnedAction || returnedAction === expectedAction;
    const isVerified = Boolean(googleResult.success) && isActionMatch && score >= MIN_RECAPTCHA_SCORE;

    if (!isVerified) {
      const timeoutHit = googleResult['error-codes']?.includes('verification-timeout');

      response.status(timeoutHit ? 504 : 400).json({
        success: false,
        score,
        action: googleResult.action,
        errors: googleResult['error-codes'] ?? [],
        error: timeoutHit
          ? 'Timed out while talking to Google reCAPTCHA.'
          : !isActionMatch
            ? 'reCAPTCHA action mismatch.'
            : score < MIN_RECAPTCHA_SCORE
              ? 'Suspicious activity detected. Please try again.'
              : 'reCAPTCHA verification failed.',
      });
      return;
    }

    response.status(200).json({
      success: true,
      score,
      action: googleResult.action,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to verify reCAPTCHA right now.';
    response.status(502).json({ success: false, error: message });
  }
}
