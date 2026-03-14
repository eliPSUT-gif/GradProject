const MIN_RECAPTCHA_SCORE = 0.5;
const VERIFY_TIMEOUT_MS = 8000;
const RECAPTCHA_VERIFY_URL = 'https://www.recaptcha.net/recaptcha/api/siteverify';

function timeoutAfter<T>(ms: number, response: T) {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(response), ms);
  });
}

export const maxDuration = 10;

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return Response.json({ success: false, error: 'Method not allowed.' }, { status: 405 });
  }

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    return Response.json({ success: false, error: 'reCAPTCHA secret key is not configured.' }, { status: 500 });
  }

  let payload: { token?: string; action?: string };

  try {
    payload = (await request.json()) as { token?: string; action?: string };
  } catch {
    return Response.json({ success: false, error: 'Invalid request payload.' }, { status: 400 });
  }

  if (!payload.token || !payload.action) {
    return Response.json({ success: false, error: 'Missing reCAPTCHA token or action.' }, { status: 400 });
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
    const isActionMatch = googleResult.action === payload.action;
    const isVerified = Boolean(googleResult.success) && isActionMatch && score >= MIN_RECAPTCHA_SCORE;

    if (!isVerified) {
      const timeoutHit = googleResult['error-codes']?.includes('verification-timeout');

      return Response.json(
        {
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
        },
        { status: timeoutHit ? 504 : 400 }
      );
    }

    return Response.json({
      success: true,
      score,
      action: googleResult.action,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to verify reCAPTCHA right now.';
    return Response.json({ success: false, error: message }, { status: 502 });
  }
}
