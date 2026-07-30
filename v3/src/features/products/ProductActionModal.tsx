import { useEffect, useRef, useState } from 'react';
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

/** Round a money value to 2 decimals, returned as a clean input string. */
const money = (n: number) => String(Math.round(n * 100) / 100);

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
  // A single price field; the toggle decides whether it means the whole batch's
  // total or the per-unit price. The other figure is derived for the readout.
  const [priceMode, setPriceMode] = useState<'total' | 'unit'>('total');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Manufacture products are sale-only (no stock-in).
  const isManufacture = product?.product_type === 'manufacture';

  // Seed only when the modal switches subject (another product, or a different
  // entry to edit). Reopening the same one keeps what was typed, so closing is
  // never destructive. Cleared on a save.
  const seededFor = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !product) return;
    const subject = `${product.id}:${editTx?.id ?? 'new'}`;
    if (seededFor.current === subject) return;
    seededFor.current = subject;
    if (editTx) {
      setTab(editTx.type);
      setQty(String(editTx.quantity));
      setPriceMode('total');
      setPrice(money(editTx.total_amount));
      setNote(editTx.note ?? '');
    } else {
      setTab(product.product_type === 'manufacture' ? 'sale' : 'stock');
      setQty('');
      setPriceMode('total');
      setPrice('');
      setNote('');
    }
  }, [open, editTx, product]);

  if (!product) return null;

  const isStock = tab === 'stock';
  const qtyNum = parseFloat(qty) || 0;
  const priceNum = parseFloat(price) || 0;
  const hasImage = product.image_url && product.image_url !== 'null';
  const unit = product.quantity_type || 'piece';

  // Derive the total and per-unit from whichever basis the toggle is on.
  const totalNum = priceMode === 'total' ? priceNum : priceNum * qtyNum;
  const unitNum = priceMode === 'unit' ? priceNum : qtyNum > 0 ? priceNum / qtyNum : 0;

  // Contextual recent reference: last buy for a stock-in, last sale for a sale.
  const refPrice = isStock ? product.last_purchase_price : product.last_sale_price;
  const refLabel = isStock ? t.lastPurchase : t.lastSale;

  // Stock available for a sale (ready-made only). When editing, reverse the edited
  // entry's effect so lowering/raising it validates against the true baseline.
  const available =
    (product.current_stock || 0) +
    (editTx ? (editTx.type === 'sale' ? editTx.quantity : -editTx.quantity) : 0);

  // Tapping the recent reference drops it straight into the price field, with the
  // toggle moved to per-unit so the figure means what it says.
  const useRefPrice = () => {
    if (refPrice == null) return;
    setPriceMode('unit');
    setPrice(money(refPrice));
  };

  // Flip the toggle, converting the current value so it stays equivalent.
  const switchMode = (m: 'total' | 'unit') => {
    if (m === priceMode) return;
    if (qtyNum > 0 && price.trim() !== '') {
      setPrice(m === 'unit' ? money(unitNum) : money(totalNum));
    }
    setPriceMode(m);
  };

  const submit = async () => {
    const q = parseFloat(qty);
    if (!q || q <= 0) {
      alert(t.enterValidQuantity);
      return;
    }
    if (isNaN(priceNum) || priceNum < 0 || price.trim() === '') {
      alert(t.enterValidPrice);
      return;
    }
    // A ready-made sale cannot exceed the stock in hand (manufacture stock is unknown).
    if (tab === 'sale' && !isManufacture && q - available > 1e-9) {
      alert(`${t.notEnoughStock} ${formatNumber(available)} ${unit}`);
      return;
    }
    setSaving(true);
    try {
      // Editing PUTs the entry itself, so its id/seq/timestamp survive.
      await saveProductTransaction({
        productId: product.id,
        type: tab,
        quantity: q,
        // The API stores the per-unit price and derives the total from it.
        pricePerUnit: Math.round(unitNum * 100) / 100,
        note: note.trim() || null,
        transactionId: editTx?.id ?? null,
      });
      seededFor.current = null;
      onSaved();
      onClose();
    } catch (err) {
      // 'settled' explains why a paid tab sale cannot be edited here; both it
      // and the stock guard carry a message worth reading verbatim.
      if (
        err instanceof ApiError &&
        (err.code === 'insufficient_stock' || err.code === 'settled' || err.code === 'validation')
      ) {
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
                {isManufacture ? (
                  t.typeManufacture
                ) : (
                  <>
                    {t.stock}: {formatNumber(product.current_stock || 0)} {unit}
                  </>
                )}
              </span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label={t.close}>
            <span className="material-symbols-outlined icon-lg">close</span>
          </button>
        </div>
      }
      footer={
        <button
          className={`btn btn-block btn-margin ${isStock ? styles.saveStock : styles.saveSale}`}
          onClick={submit}
          disabled={saving}
        >
          {editTx ? t.update : t.save}
        </button>
      }
    >
      <div className={styles.body} style={{ gap: '1rem' }}>
        {!editTx && !isManufacture && (
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

        <div className={styles.priceBlock}>
          <div className={styles.priceHeader}>
            <span className={styles.priceHeaderLabel}>{t.price}</span>
            <div className={styles.priceToggle} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={priceMode === 'total'}
                className={`${styles.priceToggleBtn} ${priceMode === 'total' ? styles.priceToggleActive : ''}`}
                onClick={() => switchMode('total')}
              >
                {t.totalPrice}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={priceMode === 'unit'}
                className={`${styles.priceToggleBtn} ${priceMode === 'unit' ? styles.priceToggleActive : ''}`}
                onClick={() => switchMode('unit')}
              >
                {t.pricePerUnit}
              </button>
            </div>
          </div>

          {refPrice != null && (
            <button
              type="button"
              className={styles.lastPrice}
              title={t.useThisPrice}
              onClick={useRefPrice}
            >
              <span className={`material-symbols-outlined icon-sm ${styles.lastPricesIcon}`}>
                history
              </span>
              {refLabel} <b>{formatCurrency(refPrice)}</b> / {unit}
            </button>
          )}

          <div className={styles.priceInput}>
            <span className={styles.priceCurrency}>৳</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              aria-label={priceMode === 'total' ? t.totalPrice : t.pricePerUnit}
            />
          </div>

          <div className={styles.priceReadout}>
            <span>{priceMode === 'total' ? t.pricePerUnit : t.totalPrice}</span>
            <span className={styles.priceReadoutValue}>
              {priceMode === 'total'
                ? `${formatCurrency(unitNum)} / ${unit}`
                : formatCurrency(totalNum)}
            </span>
          </div>
        </div>

        <div className="field">
          <label htmlFor="txNote">
            {t.note} <span className={styles.optional}>({t.optional})</span>
          </label>
          <textarea
            id="txNote"
            className="textarea"
            rows={2}
            maxLength={255} // matches the column, so a long note can't 422
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t.notePlaceholder}
          />
        </div>
      </div>
    </Modal>
  );
}
