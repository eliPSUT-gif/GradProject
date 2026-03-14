const MIN_RECAPTCHA_SCORE = 0.5;
const VERIFY_TIMEOUT_MS = 10000;

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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

  try {
    const googleResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: verificationBody.toString(),
      signal: controller.signal,
    });

    const result = (await googleResponse.json()) as {
      success?: boolean;
      score?: number;
      action?: string;
      ['error-codes']?: string[];
    };

    const score = Number(result.score ?? 0);
    const isActionMatch = result.action === payload.action;
    const isVerified = Boolean(result.success) && isActionMatch && score >= MIN_RECAPTCHA_SCORE;

    if (!isVerified) {
      return Response.json(
        {
          success: false,
          score,
          action: result.action,
          errors: result['error-codes'] ?? [],
          error: !isActionMatch
            ? 'reCAPTCHA action mismatch.'
            : score < MIN_RECAPTCHA_SCORE
              ? 'Suspicious activity detected. Please try again.'
              : 'reCAPTCHA verification failed.',
        },
        { status: 400 }
      );
    }

    return Response.json({
      success: true,
      score,
      action: result.action,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return Response.json({ success: false, error: 'Timed out while talking to Google reCAPTCHA.' }, { status: 504 });
    }

    return Response.json({ success: false, error: 'Unable to verify reCAPTCHA right now.' }, { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }
}
