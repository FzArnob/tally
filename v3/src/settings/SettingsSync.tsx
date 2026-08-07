import { useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { saveUserSettings } from '../lib/api';
import type { UserSettings } from '../types';

/**
 * Bridges the theme/language choice to the signed-in account.
 *
 * The two contexts stay cookie-backed on their own: that is what paints the
 * first frame before any request has been made, and it is all a signed-out
 * visitor has. This component adds the account half — on sign-in the stored
 * preferences win over whatever this browser remembered, and every later change
 * is written back — so the same account looks the same on a second device.
 *
 * Renders nothing; it only exists to hold the effects. It must live inside the
 * auth provider and inside both preference providers.
 */
export function SettingsSync() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { lang, setLang } = useI18n();

  // What the server is known to hold. Adoption fills it in before touching the
  // contexts, so the push effect below sees no difference and stays quiet —
  // that is what keeps adopt → push → adopt from looping.
  const stored = useRef<UserSettings | null>(null);
  // The user whose adopted preferences the contexts have actually caught up to.
  // Until they have, a difference is the adoption still in flight, not a choice.
  const settled = useRef<string | null>(null);
  const userId = user?.id ?? null;

  // Sign-in (and the reload that revalidates the token): take the account's
  // preferences. Runs per user, not per render, so a later local change is not
  // undone by the value the session was opened with.
  useEffect(() => {
    if (!user) {
      stored.current = null;
      settled.current = null;
      return;
    }
    stored.current = { theme: user.theme, language: user.language };
    setTheme(user.theme);
    setLang(user.language);
    // Only the identity matters here: re-adopting on every `user` object would
    // fight the user's own toggling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, setTheme, setLang]);

  // Any change made while signed in goes to the account. Best-effort: a failed
  // save leaves the cookie copy in place, so the choice still holds locally.
  useEffect(() => {
    const known = stored.current;
    if (!userId || !known) return;

    // The adopt effect's setTheme/setLang only land on the next render, but this
    // effect already ran beside it — still holding the values this device booted
    // with. Treating those as a change would push the device's defaults over the
    // account (and race the correction behind it), so wait for the render that
    // carries what was adopted before anything counts as the user's own choice.
    if (settled.current !== userId) {
      if (known.theme === theme && known.language === lang) settled.current = userId;
      return;
    }

    if (known.theme === theme && known.language === lang) return;
    stored.current = { theme, language: lang };
    saveUserSettings({ theme, language: lang }).catch(() => {
      /* offline or rejected — the cookie still carries the choice */
    });
  }, [userId, theme, lang]);

  return null;
}
