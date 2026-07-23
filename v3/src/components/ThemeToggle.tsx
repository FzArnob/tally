import { useI18n } from '../i18n/LanguageContext';
import { useTheme, type ThemeMode } from '../theme/ThemeContext';

// One button that cycles System → Light → Dark. The icon reflects the current
// mode so the choice is always visible.
const ICON: Record<ThemeMode, string> = {
  system: 'brightness_auto',
  light: 'light_mode',
  dark: 'dark_mode',
};

const LABEL_KEY: Record<ThemeMode, 'themeSystem' | 'themeLight' | 'themeDark'> = {
  system: 'themeSystem',
  light: 'themeLight',
  dark: 'themeDark',
};

export function ThemeToggle() {
  const { theme, cycleTheme } = useTheme();
  const { t } = useI18n();
  const label = `${t.theme}: ${t[LABEL_KEY[theme]]}`;

  return (
    <button className="icon-btn" onClick={cycleTheme} aria-label={label} title={label}>
      <span className="material-symbols-outlined icon-lg">{ICON[theme]}</span>
    </button>
  );
}
