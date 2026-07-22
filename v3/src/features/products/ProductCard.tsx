import { useI18n } from '../../i18n/LanguageContext';
import { useLongPress } from '../../hooks/useLongPress';
import type { Product } from '../../types';
import styles from './products.module.css';

interface ProductCardProps {
  product: Product;
  index: number;
  onOpen: () => void;
  onHistory: () => void;
}

export function ProductCard({ product, index, onOpen, onHistory }: ProductCardProps) {
  const { formatNumber } = useI18n();
  const press = useLongPress({ onClick: onOpen, onLongPress: onHistory });
  const stock = product.current_stock || 0;
  const hasImage = product.image_url && product.image_url !== 'null';

  return (
    <div
      className={styles.card}
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
      {...press}
    >
      <span className={`${styles.stockPill} ${stock <= 0 ? styles.low : ''}`}>
        {formatNumber(stock)}
      </span>
      {hasImage ? (
        <img className={styles.thumb} src={product.image_url as string} alt="" />
      ) : (
        <span className={`material-symbols-outlined icon-xl ${styles.cardIcon}`}>inventory_2</span>
      )}
      <span className={styles.name}>{product.name}</span>
      <span className={styles.stock}>{product.quantity_type || 'piece'}</span>
    </div>
  );
}
