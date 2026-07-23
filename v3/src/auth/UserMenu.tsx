import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/LanguageContext';
import { LANGUAGES } from '../i18n/translations';
import { useTheme, type ThemeMode } from '../theme/ThemeContext';
import { useAuth } from './AuthContext';
import styles from './auth.module.css';

// The theme cycles System → Light → Dark; the icon/label reflect the current mode.
const THEME_ICON: Record<ThemeMode, string> = {
  system: 'brightness_auto',
  light: 'light_mode',
  dark: 'dark_mode',
};
const THEME_LABEL: Record<ThemeMode, 'themeSystem' | 'themeLight' | 'themeDark'> = {
  system: 'themeSystem',
  light: 'themeLight',
  dark: 'themeDark',
};

/**
 * Header account control — avatar button whose dropdown holds the theme and
 * language controls (previously standalone header icons) above sign out.
 */
export function UserMenu() {
  const { user, signOut } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { theme, cycleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!user) return null;
  const initial = (user.name || user.email || '?').trim().charAt(0).toUpperCase();

  return (
    <div className={styles.menu} ref={ref}>
      <button
        className={styles.avatarBtn}
        onClick={() => setOpen((v) => !v)}
        aria-label={t.account}
        aria-expanded={open}
      >
        {user.picture ? (
          <img className={styles.avatar} src={user.picture} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className={styles.avatarFallback}>{initial}</span>
        )}
      </button>

      <div className={`${styles.dropdown} ${open ? styles.dropdownOpen : ''}`}>
        <div className={styles.identity}>
          <span className={styles.identityName}>{user.name || t.account}</span>
          {user.email && <span className={styles.identityEmail}>{user.email}</span>}
        </div>

        {/* Theme — cycles in place, keeping the menu open. */}
        <div className={styles.group}>
          <button className={styles.row} onClick={cycleTheme}>
            <span className="material-symbols-outlined icon-md">{THEME_ICON[theme]}</span>
            <span className={styles.rowLabel}>{t.theme}</span>
            <span className={styles.rowValue}>{t[THEME_LABEL[theme]]}</span>
          </button>
        </div>

        {/* Language — one selectable row per language. */}
        <div className={styles.group}>
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              className={`${styles.row} ${lang === l.code ? styles.rowActive : ''}`}
              onClick={() => setLang(l.code)}
              aria-pressed={lang === l.code}
            >
              <span className={styles.flag}>{l.flag}</span>
              <span className={styles.rowLabel}>{t[l.nameKey]}</span>
              {lang === l.code && <span className="material-symbols-outlined icon-md">check</span>}
            </button>
          ))}
        </div>

        <button
          className={styles.signOut}
          onClick={() => {
            setOpen(false);
            void signOut();
          }}
        >
          <span className="material-symbols-outlined icon-md">logout</span>
          {t.signOut}
        </button>
      </div>
    </div>
  );
}
