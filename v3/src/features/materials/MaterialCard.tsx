import { useI18n } from '../../i18n/LanguageContext';
import type { Material } from '../../types';
import styles from './materials.module.css';

interface MaterialCardProps {
  material: Material;
  index: number;
  onOpen: () => void;
  onHistory: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function MaterialCard({
  material,
  index,
  onOpen,
  onHistory,
  onEdit,
  onDelete,
}: MaterialCardProps) {
  const { t, formatNumber, formatTimeShort, localizeDigits } = useI18n();
  const stock = material.current_stock || 0;
  const inStock = stock > 0;
  const hasImage = material.image_url && material.image_url !== 'null';
  const unit = material.quantity_type || 'piece';
  const count = material.transaction_count || 0;
  const last = material.last_transaction_time
    ? localizeDigits(formatTimeShort(material.last_transaction_time))
    : t.noActivity;

  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

  return (
    <div
      className={styles.row}
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
      onClick={onOpen}
      role="button"
      tabIndex={0}
    >
      <div className={styles.thumbWrap}>
        {hasImage ? (
          <img className={styles.thumb} src={material.image_url as string} alt="" />
        ) : (
          <span className={`material-symbols-outlined ${styles.thumbIcon}`}>category</span>
        )}
      </div>

      <div className={styles.info}>
        <span className={styles.name} title={material.name}>
          {material.name}
        </span>
        <span className={styles.meta}>
          {last}
          {count > 0 && (
            <>
              {' · '}
              {localizeDigits(String(count))} {t.transactions}
            </>
          )}
        </span>
      </div>

      <div className={styles.right}>
        <span className={styles.stockWrap}>
          <span className={`${styles.stockValue} ${inStock ? 'text-positive' : 'text-negative'}`}>
            {formatNumber(stock)}
          </span>
          <span className={styles.stockUnit}>{unit}</span>
        </span>
        <div className={styles.rowActions} onClick={stop}>
          <button className="ghost-btn" aria-label={t.history} onClick={onHistory}>
            <span className="material-symbols-outlined icon-md">history</span>
          </button>
          <button className="ghost-btn" aria-label={t.editMaterial} onClick={onEdit}>
            <span className="material-symbols-outlined icon-md">edit</span>
          </button>
          <button className="ghost-btn" aria-label={t.deleteMaterial} onClick={onDelete}>
            <span className="material-symbols-outlined icon-md">delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
