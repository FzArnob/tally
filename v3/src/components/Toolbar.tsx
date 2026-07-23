import styles from './Toolbar.module.css';

interface ToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  searchPlaceholder: string;
  addLabel: string;
  onAdd: () => void;
}

/** Search field + primary "Add" button. Shared by the products & customers lists. */
export function Toolbar({ query, onQueryChange, searchPlaceholder, addLabel, onAdd }: ToolbarProps) {
  return (
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
  );
}
