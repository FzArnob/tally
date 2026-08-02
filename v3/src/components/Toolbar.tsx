import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  searchPlaceholder: string;
  addLabel: string;
  onAdd: () => void;
  /** Buttons for the bar itself, sitting between the search field and Add. */
  actions?: ReactNode;
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
  actions,
  children,
}: ToolbarProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Publish the bar's height the way Header publishes its own, so a sticky
  // element further down the page (a day separator) can clear both. `children`
  // stick with the bar, so this has to be measured rather than assumed.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () =>
      document.documentElement.style.setProperty(
        '--toolbar-h',
        `${el.getBoundingClientRect().height}px`,
      );
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className={styles.bar}>
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
        {actions}
        <button className="btn btn-primary" onClick={onAdd}>
          <span className="material-symbols-outlined icon-md">add</span>
          {addLabel}
        </button>
      </div>
      {children}
    </div>
  );
}
