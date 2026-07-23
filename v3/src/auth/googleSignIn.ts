// Loader + minimal typings for Google Identity Services (GIS). The script is
// fetched once, on demand (only the login screen needs it), and the button is
// rendered by Google itself via renderButton().

export interface GoogleCredentialResponse {
  /** The Google ID token (a JWT) — sent to our backend for verification. */
  credential: string;
}

interface GoogleIdConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
}

interface GoogleButtonOptions {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'small' | 'medium' | 'large';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  width?: number;
  logo_alignment?: 'left' | 'center';
  /** BCP-47 locale for the rendered button text (e.g. 'en', 'bn'). */
  locale?: string;
}

interface GoogleAccountsId {
  initialize(config: GoogleIdConfig): void;
  renderButton(parent: HTMLElement, options: GoogleButtonOptions): void;
  prompt(): void;
  disableAutoSelect(): void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const SRC = 'https://accounts.google.com/gsi/client';
let loadPromise: Promise<void> | null = null;
let loadedLocale: string | null = null;

/**
 * Load the GIS client script, resolving when window.google.accounts.id is ready.
 *
 * The rendered button's language is fixed by the `hl` the script is loaded with
 * (the per-button `locale` option does not reliably override it), so when the app
 * language changes we tear the script down and reload it with the new `hl`.
 */
export function loadGoogleIdentity(locale = ''): Promise<void> {
  if (window.google?.accounts?.id && loadedLocale === locale) return Promise.resolve();

  // Already loaded in a different language — remove it so we can reload with the new hl.
  if (loadedLocale !== null && loadedLocale !== locale) {
    document.querySelectorAll('script[data-gsi]').forEach((s) => s.remove());
    delete window.google;
    loadPromise = null;
    loadedLocale = null;
  }

  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = locale ? `${SRC}?hl=${encodeURIComponent(locale)}` : SRC;
    script.async = true;
    script.defer = true;
    script.dataset.gsi = 'true';
    script.onload = () => {
      loadedLocale = locale;
      resolve();
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error('Failed to load Google Sign-In.'));
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}
