import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/LanguageContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useAuth } from './AuthContext';
import { loadGoogleIdentity } from './googleSignIn';
import styles from './auth.module.css';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

/** Sign-in screen shown whenever there is no valid session. */
export function LoginScreen() {
  const { t, lang } = useI18n();
  const { loginWithGoogle } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Re-runs when `lang` changes so the Google button is re-rendered in the
  // matching locale (GIS bakes the button text at render time).
  useEffect(() => {
    if (!CLIENT_ID) {
      setError(t.googleNotConfigured);
      return;
    }
    let cancelled = false;
    loadGoogleIdentity(lang)
      .then(() => {
        if (cancelled || !buttonRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => {
            setBusy(true);
            setError(null);
            loginWithGoogle(response.credential).catch((e: unknown) => {
              setError(e instanceof Error ? e.message : t.signInFailed);
              setBusy(false);
            });
          },
        });
        // Clear any button from a previous render (e.g. after a language switch).
        buttonRef.current.replaceChildren();
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'center',
          locale: lang,
        });
      })
      .catch(() => setError(t.signInFailed));
    return () => {
      cancelled = true;
    };
  }, [loginWithGoogle, t, lang]);

  return (
    <>
      <div className={styles.topControls}>
        <ThemeToggle />
        <LanguageSwitcher />
      </div>

      <div className={styles.screen}>
        <div className={styles.icon}>
          <span className="material-symbols-outlined">menu_book</span>
        </div>
        <h1 className={styles.title}>{t.appName}</h1>
        <p className={styles.subtitle}>{t.signInSubtitle}</p>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.buttonArea}>
          {busy ? (
            <span className={styles.spinner} />
          ) : (
            <div className={styles.googleButton} ref={buttonRef} />
          )}
        </div>
      </div>
    </>
  );
}
