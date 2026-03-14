declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

const RECAPTCHA_SCRIPT_ID = 'google-recaptcha-v3';
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

let scriptPromise: Promise<void> | null = null;

function loadRecaptchaScript() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('reCAPTCHA is only available in the browser.'));
  }

  if (window.grecaptcha) {
    return Promise.resolve();
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(RECAPTCHA_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Unable to load reCAPTCHA.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = RECAPTCHA_SCRIPT_ID;
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(RECAPTCHA_SITE_KEY ?? '')}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load reCAPTCHA.'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

function waitForRecaptchaReady() {
  return new Promise<void>((resolve, reject) => {
    if (!window.grecaptcha) {
      reject(new Error('reCAPTCHA is not ready yet.'));
      return;
    }

    window.grecaptcha.ready(() => resolve());
  });
}

export function hasRecaptchaSiteKey() {
  return Boolean(RECAPTCHA_SITE_KEY);
}

export async function executeRecaptcha(action: string) {
  if (!RECAPTCHA_SITE_KEY) {
    throw new Error('reCAPTCHA is not configured for this environment.');
  }

  await loadRecaptchaScript();
  await waitForRecaptchaReady();

  if (!window.grecaptcha) {
    throw new Error('reCAPTCHA is unavailable.');
  }

  return window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
}

interface RecaptchaVerificationResult {
  success: boolean;
  score?: number;
  action?: string;
  error?: string;
  errors?: string[];
}

export async function verifyRecaptchaToken(token: string, action: string) {
  const response = await fetch('/api/verify-recaptcha', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, action }),
  });

  const payload = (await response.json()) as RecaptchaVerificationResult;
  if (!response.ok || !payload.success) {
    throw new Error(payload.error ?? 'reCAPTCHA verification failed.');
  }

  return payload;
}
