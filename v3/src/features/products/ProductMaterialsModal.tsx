import { Modal, ModalHeader } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
import type { Product } from '../../types';
import styles from './products.module.css';

interface ProductMaterialsModalProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
}

/**
 * Read-only stock details of the materials a manufacture product is made from.
 * The product's own stock is unknown (analytics later), so this is where the
 * user checks the raw-material stock behind it.
 */
export function ProductMaterialsModal({ open, product, onClose }: ProductMaterialsModalProps) {
  const { t, formatNumber, formatCurrency, localizeDigits } = useI18n();
  const materials = product?.materials ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="materialsTitle"
      header={
        <ModalHeader
          title={product ? `${product.name} — ${t.relatedMaterials}` : t.relatedMaterials}
          titleId="materialsTitle"
          onClose={onClose}
          closeLabel={t.close}
        />
      }
    >
      <div className={styles.materialCards}>
        {materials.length === 0 ? (
          <div className="empty-state">{t.noLinkedMaterials}</div>
        ) : (
          materials.map((m) => {
            const inStock = (m.current_stock || 0) > 0;
            return (
              <div key={m.id} className={styles.materialCard}>
                <div className={styles.materialCardIcon}>
                  <span className="material-symbols-outlined">inventory_2</span>
                </div>
                <div className={styles.materialCardMain}>
                  <span className={styles.materialCardName} title={m.name}>
                    {m.name}
                  </span>
                  {m.last_purchase_price != null && (
                    <span className={styles.materialCardMeta}>
                      {t.lastPurchase} {formatCurrency(m.last_purchase_price)}
                    </span>
                  )}
                </div>
                <div className={styles.materialCardStock}>
                  <span
                    className={`${styles.materialCardValue} ${inStock ? 'text-positive' : 'text-negative'}`}
                  >
                    {localizeDigits(formatNumber(m.current_stock || 0))}
                  </span>
                  <span className={styles.materialCardUnit}>{m.quantity_type || 'piece'}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}
