import type { MouseEvent, TouchEvent } from 'react';
import { useI18n } from '../../i18n/LanguageContext';
import { useLongPress } from '../../hooks/useLongPress';
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
  const { t, formatNumber } = useI18n();
  const press = useLongPress({ onClick: onOpen, onLongPress: onHistory });
  const stock = product.current_stock || 0;
  const hasImage = product.image_url && product.image_url !== 'null';

  // Keep card tap / long-press from firing when an action button is used.
  const action = (fn: () => void) => (e: MouseEvent) => {
    e.stopPropagation();
    fn();
  };
  const swallow = (e: MouseEvent | TouchEvent) => e.stopPropagation();

  return (
    <div className={styles.cell} style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}>
      <div className={styles.card} {...press}>
        <span className={`${styles.stockPill} ${stock <= 0 ? styles.low : ''}`}>
          {formatNumber(stock)}
        </span>

        {hasImage ? (
          <img className={styles.thumb} src={product.image_url as string} alt="" />
        ) : (
          <span className={`material-symbols-outlined icon-xl ${styles.cardIcon}`}>inventory_2</span>
        )}

        <div className={styles.cardActions} onMouseDown={swallow} onTouchStart={swallow}>
          <button className={styles.actionBtn} aria-label={t.editProduct} onClick={action(onEdit)}>
            <span className="material-symbols-outlined icon-sm">edit</span>
          </button>
          <button className={styles.actionBtn} aria-label={t.history} onClick={action(onHistory)}>
            <span className="material-symbols-outlined icon-sm">history</span>
          </button>
          <button
            className={`${styles.actionBtn} ${styles.danger}`}
            aria-label={t.deleteProduct}
            onClick={action(onDelete)}
          >
            <span className="material-symbols-outlined icon-sm">delete</span>
          </button>
        </div>
      </div>

      <span className={styles.name} title={product.name}>
        {product.name}
      </span>
      <span className={styles.unit}>{product.quantity_type || 'piece'}</span>
    </div>
  );
}
