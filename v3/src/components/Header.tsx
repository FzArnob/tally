import { useI18n } from '../i18n/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import styles from './Header.module.css';

const storeLogo = `${import.meta.env.BASE_URL}store.svg`;

interface HeaderProps {
  storeName: string;
  logoUrl?: string | null;
  onOpenCustomers: () => void;
}

export function Header({ storeName, logoUrl, onOpenCustomers }: HeaderProps) {
  const { t } = useI18n();

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <div className={styles.logoBadge}>
          <img src={logoUrl || storeLogo} alt="" className={styles.logo} />
        </div>
        <h1 className={styles.storeName}>{storeName || t.appName}</h1>
      </div>

      <div className={styles.right}>
        <LanguageSwitcher />
        <button className="icon-btn" aria-label={t.customerBalances} onClick={onOpenCustomers}>
          <span className={styles.balanceIcon}>
            <span className="material-symbols-outlined icon-lg">group</span>
            <span className={styles.balanceTaka}>৳</span>
          </span>
        </button>
      </div>
    </header>
  );
}
