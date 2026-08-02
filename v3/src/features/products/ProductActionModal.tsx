import { useEffect, useRef, useState } from 'react';
import { Modal } from '../../components/Modal';
import { useQuantityPrice } from '../../hooks/useQuantityPrice';
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
  // Quantity and a single price field, whose toggle decides whether the figure
  // means the whole batch or one unit of it. See the hook for the rest.
  const {
    qty,
    price,
    priceMode,
    qtyNum,
    priceNum,
    totalNum,
    unitNum,
    setQty,
    setPrice,
    switchMode,
    applyUnitPrice,
    seed,
  } = useQuantityPrice();
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
      seed(String(editTx.quantity), editTx.total_amount);
      setNote(editTx.note ?? '');
    } else {
      setTab(product.product_type === 'manufacture' ? 'sale' : 'stock');
      seed('', null);
      setNote('');
    }
  }, [open, editTx, product, seed]);

  if (!product) return null;

  const isStock = tab === 'stock';
  const hasImage = product.image_url && product.image_url !== 'null';
  const unit = product.quantity_type || 'piece';

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
    if (refPrice != null) applyUnitPrice(refPrice);
  };

  const submit = async () => {
    if (qtyNum <= 0) {
      alert(t.enterValidQuantity);
      return;
    }
    if (isNaN(priceNum) || priceNum < 0 || price.trim() === '') {
      alert(t.enterValidPrice);
      return;
    }
    // A ready-made sale cannot exceed the stock in hand (manufacture stock is unknown).
    if (tab === 'sale' && !isManufacture && qtyNum - available > 1e-9) {
      alert(`${t.notEnoughStock} ${formatNumber(available)} ${unit}`);
      return;
    }
    setSaving(true);
    try {
      // Editing PUTs the entry itself, so its id/seq/timestamp survive.
      await saveProductTransaction({
        productId: product.id,
        type: tab,
        quantity: qtyNum,
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
                  <>
                    {/* Nothing is stocked in for a manufacture product, so the
                        form offers no choice and shows no toggle. The tag is
                        where it says what this entry will be. */}
                    {t.typeManufacture}
                    <span className="type-tag type-income">{t.sale}</span>
                  </>
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
          className="btn btn-primary btn-block btn-margin"
          onClick={submit}
          disabled={saving}
        >
          {editTx ? t.update : t.save}
        </button>
      }
    >
      <div className={styles.body} style={{ gap: '1rem' }}>
        {/* An edit cannot change what the entry is, but it still shows the row,
            locked: it is where this form says whether it is a stock-in or a sale.
            A manufacture product is sale-only and has nothing to say. */}
        {!isManufacture && (
          <div className="type-toggle">
            <button
              type="button"
              className={`type-btn type-stock ${isStock ? 'type-btn-active' : ''}`}
              onClick={() => setTab('stock')}
              aria-pressed={isStock}
              disabled={!!editTx}
            >
              {t.stockIn}
            </button>
            <button
              type="button"
              className={`type-btn type-income ${!isStock ? 'type-btn-active' : ''}`}
              onClick={() => setTab('sale')}
              aria-pressed={!isStock}
              disabled={!!editTx}
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
