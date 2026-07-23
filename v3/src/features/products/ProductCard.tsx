import { useI18n } from '../../i18n/LanguageContext';
import type { Product } from '../../types';
import styles from './products.module.css';

interface ProductCardProps {
  product: Product;
  index: number;
  onOpen: () => void;
  onHistory: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProductCard({
  product,
  index,
  onOpen,
  onHistory,
  onEdit,
  onDelete,
}: ProductCardProps) {
  const { t, formatNumber, formatTimeShort, localizeDigits } = useI18n();
  const stock = product.current_stock || 0;
  const inStock = stock > 0;
  const hasImage = product.image_url && product.image_url !== 'null';
  const unit = product.quantity_type || 'piece';
  const count = product.transaction_count || 0;
  const last = product.last_transaction_time
    ? localizeDigits(formatTimeShort(product.last_transaction_time))
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
          <img className={styles.thumb} src={product.image_url as string} alt="" />
        ) : (
          <span className={`material-symbols-outlined ${styles.thumbIcon}`}>inventory_2</span>
        )}
      </div>

      <div className={styles.info}>
        <span className={styles.name} title={product.name}>
          {product.name}
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
        <div className={styles.actions} onClick={stop}>
          <button className="ghost-btn" aria-label={t.history} onClick={onHistory}>
            <span className="material-symbols-outlined icon-md">history</span>
          </button>
          <button className="ghost-btn" aria-label={t.editProduct} onClick={onEdit}>
            <span className="material-symbols-outlined icon-md">edit</span>
          </button>
          <button className="ghost-btn" aria-label={t.deleteProduct} onClick={onDelete}>
            <span className="material-symbols-outlined icon-md">delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
