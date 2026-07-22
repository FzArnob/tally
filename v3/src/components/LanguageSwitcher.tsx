import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/LanguageContext';
import { LANGUAGES } from '../i18n/translations';
import styles from './LanguageSwitcher.module.css';

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [open]);

  return (
    <div className={styles.switcher} ref={ref}>
      <button
        className="icon-btn"
        aria-label={t.language}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="material-symbols-outlined icon-lg">translate</span>
      </button>
      <div className={`${styles.dropdown} ${open ? styles.active : ''}`} role="listbox">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            role="option"
            aria-selected={lang === l.code}
            className={`${styles.option} ${lang === l.code ? styles.selected : ''}`}
            onClick={() => {
              setLang(l.code);
              setOpen(false);
            }}
          >
            <span className={styles.flag}>{l.flag}</span>
            <span className={styles.name}>{t[l.nameKey]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
