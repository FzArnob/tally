import { useEffect, useState } from 'react';
import { Modal, ModalHeader } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
import { getProductMaterials } from '../../lib/api';
import type { Product, ProductMaterial } from '../../types';
import styles from './products.module.css';

interface ProductMaterialsModalProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
}

/**
 * Read-only stock details of the materials a manufacture product is made from.
 * The product's own stock is unknown (analytics later), so this is where the
 * user checks the raw-material stock behind it. Materials are fetched on demand
 * (the product list doesn't carry them) each time the sheet opens.
 */
export function ProductMaterialsModal({ open, product, onClose }: ProductMaterialsModalProps) {
  const { t, formatNumber, formatCurrency, localizeDigits } = useI18n();
  const [materials, setMaterials] = useState<ProductMaterial[]>([]);
  // The linked stock added up, as the API sends it — the nearest thing a
  // manufacture product has to a stock value of its own, since it holds none.
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const productId = product?.id ?? null;

  useEffect(() => {
    if (!open || productId == null) return;
    let alive = true;
    setLoading(true);
    setMaterials([]);
    (async () => {
      try {
        const data = await getProductMaterials(productId);
        if (!alive) return;
        setMaterials(data.materials);
        setTotal(data.total_stock_value);
      } catch (err) {
        console.error('Failed to load product materials:', err);
        if (alive) setMaterials([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, productId]);

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
        {loading ? (
          <div className="empty-state">…</div>
        ) : materials.length === 0 ? (
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
                  <span className={styles.materialCardFigure}>
                    <span
                      className={`${styles.materialCardValue} ${inStock ? 'text-positive' : 'text-negative'}`}
                    >
                      {localizeDigits(formatNumber(m.current_stock || 0))}
                    </span>
                    <span className={styles.materialCardUnit}>{m.quantity_type || 'piece'}</span>
                  </span>
                  <span className={styles.materialCardAmount} title={t.stockValue}>
                    {formatCurrency(m.stock_value)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!loading && materials.length > 0 && (
        <div className={`${styles.totalRow} ${styles.materialsTotal}`}>
          <span>{t.totalStockValue}</span>
          <span className={styles.totalValue}>{formatCurrency(total)}</span>
        </div>
      )}
    </Modal>
  );
}
