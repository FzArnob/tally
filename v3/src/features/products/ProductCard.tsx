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
  /** Open the linked-material stock details (manufacture products). */
  onMaterials: () => void;
}

export function ProductCard({
  product,
  index,
  onOpen,
  onHistory,
  onEdit,
  onDelete,
  onMaterials,
}: ProductCardProps) {
  const { t, formatCurrency, formatNumber, formatTimeShort, localizeDigits } = useI18n();
  const isManufacture = product.product_type === 'manufacture';
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
      className={styles.card}
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
        {count > 0 && (
          <span className={styles.countBadge} title={`${count} ${t.transactions}`}>
            <span className="material-symbols-outlined icon-sm">swap_vert</span>
            {localizeDigits(String(count))}
          </span>
        )}
      </div>

      <span className={styles.name} title={product.name}>
        {product.name}
      </span>

      <span className={styles.meta}>{last}</span>

      {/* Manufacture products have no stock of their own — their figure lives in
          the linked materials, so the slot becomes a way in to those. */}
      {isManufacture ? (
        <button
          className={styles.viewStockBtn}
          onClick={(e) => {
            stop(e);
            onMaterials();
          }}
        >
          <span className="material-symbols-outlined icon-sm">show_chart</span>
          <span className={styles.viewStockLabel}>{t.viewStock}</span>
        </button>
      ) : (
        <div className={styles.stockBlock}>
          <span className={styles.stockWrap}>
            <span className={`${styles.stockValue} ${inStock ? 'text-positive' : 'text-negative'}`}>
              {formatNumber(stock)}
            </span>
            <span className={styles.stockUnit}>{unit}</span>
          </span>
          <span className={styles.stockAmount} title={t.stockValue}>
            {formatCurrency(product.stock_value ?? 0)}
          </span>
        </div>
      )}

      <div className={styles.rowActions} onClick={stop}>
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
  );
}
