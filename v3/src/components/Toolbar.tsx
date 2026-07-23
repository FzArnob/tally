import type { ReactNode } from 'react';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  searchPlaceholder: string;
  addLabel: string;
  onAdd: () => void;
  /** Extra content that sticks together with the toolbar (e.g. a totals card). */
  children?: ReactNode;
}

/**
 * Search field + primary "Add" button, shared by the products & customers lists.
 * The whole bar sticks just below the app header; any `children` stick with it.
 */
export function Toolbar({
  query,
  onQueryChange,
  searchPlaceholder,
  addLabel,
  onAdd,
  children,
}: ToolbarProps) {
  return (
    <div className={styles.bar}>
      <div className={styles.toolbar}>
        <div className={styles.search}>
          <span className="material-symbols-outlined icon-md">search</span>
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
        </div>
        <button className="btn btn-primary" onClick={onAdd}>
          <span className="material-symbols-outlined icon-md">add</span>
          {addLabel}
        </button>
      </div>
      {children}
    </div>
  );
}
