import type { ReactNode } from 'react';
import styles from './Header.module.css';

interface HeaderProps {
  /** Leading element — a logo badge, back button, etc. */
  leading: ReactNode;
  title: string;
  /** Right-aligned action buttons (theme, language, …). */
  actions?: ReactNode;
}

/** Reusable sticky app bar shared by every page. */
export function Header({ leading, title, actions }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        {leading}
        <h1 className={styles.title} title={title}>
          {title}
        </h1>
      </div>
      {actions && <div className={styles.right}>{actions}</div>}
    </header>
  );
}

/** Rounded store-logo badge used as the home header's leading element. */
export function HeaderLogo({ src }: { src: string }) {
  return (
    <div className={styles.logoBadge}>
      <img src={src} alt="" className={styles.logo} />
    </div>
  );
}

/** Back button used as a leading element on sub-pages. */
export function HeaderBackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="icon-btn" aria-label={label} onClick={onClick}>
      <span className="material-symbols-outlined icon-lg">arrow_back</span>
    </button>
  );
}

/** Customer-balances action button (group icon with a ৳ badge). */
export function CustomersButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="icon-btn" aria-label={label} onClick={onClick}>
      <span className={styles.balanceIcon}>
        <span className="material-symbols-outlined icon-lg">group</span>
        <span className={styles.balanceTaka}>৳</span>
      </span>
    </button>
  );
}
