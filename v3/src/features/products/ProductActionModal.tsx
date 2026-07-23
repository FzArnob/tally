import { useEffect, useState } from 'react';
import { Modal } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
import { saveProductTransaction } from '../../lib/api';
import { ApiError, type Product, type ProductTransaction, type TransactionType } from '../../types';
import styles from './products.module.css';

interface ProductActionModalProps {
  open: boolean;
  product: Product | null;
  editTx: ProductTransaction | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ProductActionModal({
  open,
  product,
  editTx,
  onClose,
  onSaved,
}: ProductActionModalProps) {
  const { t, formatCurrency, formatNumber } = useI18n();
  const [tab, setTab] = useState<TransactionType>('stock');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editTx) {
      setTab(editTx.type);
      setQty(String(editTx.quantity));
      setPrice(String(editTx.price_per_unit));
    } else {
      setTab('stock');
      setQty('');
      setPrice('');
    }
  }, [open, editTx]);

  if (!product) return null;

  const isStock = tab === 'stock';
  const total = (parseFloat(qty) || 0) * (parseFloat(price) || 0);
  const hasImage = product.image_url && product.image_url !== 'null';

  // Stock available for a sale. When editing, reverse the edited entry's effect
  // so lowering/raising it validates against the true baseline (mirrors the API).
  const unit = product.quantity_type || 'piece';
  const available =
    (product.current_stock || 0) +
    (editTx ? (editTx.type === 'sale' ? editTx.quantity : -editTx.quantity) : 0);

  const submit = async () => {
    const q = parseFloat(qty);
    const p = parseFloat(price);
    if (!q || q <= 0) {
      alert(t.enterValidQuantity);
      return;
    }
    if (isNaN(p) || p < 0) {
      alert(t.enterValidPrice);
      return;
    }
    // A sale cannot exceed the stock in hand (stock never goes below 0).
    if (tab === 'sale' && q - available > 1e-9) {
      alert(`${t.notEnoughStock} ${formatNumber(available)} ${unit}`);
      return;
    }
    setSaving(true);
    try {
      // Editing passes `replaces` so the API swaps the entry atomically.
      await saveProductTransaction({
        productId: product.id,
        type: tab,
        quantity: q,
        pricePerUnit: p,
        replaces: editTx?.id ?? null,
      });
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'insufficient_stock') {
        alert(err.message);
      } else {
        console.error('Failed to save transaction:', err);
        alert(t.failedSaveTransaction);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="actionTitle"
      header={
        <div className={styles.actionHeader}>
          <div className={styles.headerInfo}>
            {hasImage && <img className={styles.actionThumb} src={product.image_url as string} alt="" />}
            <div style={{ minWidth: 0 }}>
              <div className={styles.actionTitleRow}>
                <h3
                  id="actionTitle"
                  className={styles.actionName}
                  title={product.name}
                  style={{ fontSize: 'var(--fs-heading-sm)', fontWeight: 600 }}
                >
                  {product.name}
                </h3>
              </div>
              <span className={styles.actionStock}>
                {t.stock}: {formatNumber(product.current_stock || 0)} {product.quantity_type || 'piece'}
                {product.last_purchase_price != null && (
                  <> · {t.lastPurchase} {formatCurrency(product.last_purchase_price)}</>
                )}
                {product.last_sale_price != null && (
                  <> · {t.lastSale} {formatCurrency(product.last_sale_price)}</>
                )}
              </span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label={t.close}>
            <span className="material-symbols-outlined icon-lg">close</span>
          </button>
        </div>
      }
    >
      <div className={styles.body} style={{ gap: '1rem' }}>
        {!editTx && (
          <div className={styles.tabSwitch}>
            <button
              className={`${styles.tabBtn} ${isStock ? styles.activeStock : ''}`}
              onClick={() => setTab('stock')}
            >
              {t.stockIn}
            </button>
            <button
              className={`${styles.tabBtn} ${!isStock ? styles.activeSale : ''}`}
              onClick={() => setTab('sale')}
            >
              {t.sale}
            </button>
          </div>
        )}

        <div className="field">
          <label htmlFor="qty">{t.quantity}</label>
          <input
            id="qty"
            className="input"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="0"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="price">{isStock ? t.buyingPrice : t.sellingPrice}</label>
          <input
            id="price"
            className="input"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="0.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>

        <div className={styles.totalRow}>
          <span>{t.total}</span>
          <span className={styles.totalValue}>{formatCurrency(total)}</span>
        </div>

        <button
          className={`btn btn-block ${isStock ? styles.saveStock : styles.saveSale}`}
          onClick={submit}
          disabled={saving}
        >
          {editTx ? t.update : t.save}
        </button>
      </div>
    </Modal>
  );
}
