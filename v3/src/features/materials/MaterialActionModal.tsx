import { useEffect, useState } from 'react';
import { Modal } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
import { saveMaterialTransaction } from '../../lib/api';
import {
  ApiError,
  type Material,
  type MaterialTransaction,
  type MaterialTransactionType,
} from '../../types';
import styles from './materials.module.css';

interface MaterialActionModalProps {
  open: boolean;
  material: Material | null;
  editTx: MaterialTransaction | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Which move types reduce stock (guarded against the stock in hand). */
const OUTFLOWS: MaterialTransactionType[] = ['sale', 'used'];

/** Round a money value to 2 decimals, returned as a clean input string. */
const money = (n: number) => String(Math.round(n * 100) / 100);

export function MaterialActionModal({
  open,
  material,
  editTx,
  onClose,
  onSaved,
}: MaterialActionModalProps) {
  const { t, formatCurrency, formatNumber } = useI18n();
  const [tab, setTab] = useState<MaterialTransactionType>('stock');
  const [qty, setQty] = useState('');
  // A single price field; the toggle decides whether it means the whole batch's
  // total or the per-unit price. The other figure is derived for the readout.
  const [priceMode, setPriceMode] = useState<'total' | 'unit'>('total');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !material) return;
    if (editTx) {
      setTab(editTx.type);
      setQty(String(editTx.quantity));
      setPriceMode('total');
      setPrice(editTx.type === 'used' ? '' : money(editTx.total_amount));
    } else {
      setTab('stock');
      setQty('');
      setPriceMode('total');
      setPrice('');
    }
  }, [open, editTx, material]);

  if (!material) return null;

  const isUsed = tab === 'used';
  const isStock = tab === 'stock';
  const qtyNum = parseFloat(qty) || 0;
  const priceNum = parseFloat(price) || 0;
  const hasImage = material.image_url && material.image_url !== 'null';
  const unit = material.quantity_type || 'piece';

  // Derive the total and per-unit from whichever basis the toggle is on.
  const totalNum = priceMode === 'total' ? priceNum : priceNum * qtyNum;
  const unitNum = priceMode === 'unit' ? priceNum : qtyNum > 0 ? priceNum / qtyNum : 0;

  // Stock available for a sale/used move. When editing, reverse the edited
  // entry's effect so it validates against the true baseline (mirrors the API).
  const available =
    (material.current_stock || 0) +
    (editTx ? (OUTFLOWS.includes(editTx.type) ? editTx.quantity : -editTx.quantity) : 0);

  const saveClass = isStock ? styles.saveStock : isUsed ? styles.saveUsed : styles.saveSale;

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
    if (!isUsed && (isNaN(priceNum) || priceNum < 0 || price.trim() === '')) {
      alert(t.enterValidTotalPrice);
      return;
    }
    if (OUTFLOWS.includes(tab) && q - available > 1e-9) {
      alert(`${t.notEnoughStock} ${formatNumber(available)} ${unit}`);
      return;
    }
    setSaving(true);
    try {
      await saveMaterialTransaction({
        materialId: material.id,
        type: tab,
        quantity: q,
        // The server always stores the total and derives per-unit from it.
        totalAmount: isUsed ? 0 : Math.round(totalNum * 100) / 100,
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
      labelledBy="materialActionTitle"
      header={
        <div className={styles.actionHeader}>
          <div className={styles.headerInfo}>
            {hasImage && <img className={styles.actionThumb} src={material.image_url as string} alt="" />}
            <div style={{ minWidth: 0 }}>
              <h3
                id="materialActionTitle"
                className={styles.actionName}
                title={material.name}
                style={{ fontSize: 'var(--fs-heading-sm)', fontWeight: 600 }}
              >
                {material.name}
              </h3>
              <span className={styles.actionStock}>
                {t.stock}: {formatNumber(material.current_stock || 0)} {unit}
                {material.last_purchase_price != null && (
                  <> · {t.lastPurchase} {formatCurrency(material.last_purchase_price)}</>
                )}
                {material.last_sale_price != null && (
                  <> · {t.lastSale} {formatCurrency(material.last_sale_price)}</>
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
              className={`${styles.tabBtn} ${tab === 'sale' ? styles.activeSale : ''}`}
              onClick={() => setTab('sale')}
            >
              {t.sale}
            </button>
            <button
              className={`${styles.tabBtn} ${isUsed ? styles.activeUsed : ''}`}
              onClick={() => setTab('used')}
            >
              {t.stockUsed}
            </button>
          </div>
        )}

        <div className="field">
          <label htmlFor="mQty">{isUsed ? t.quantityUsed : t.quantity}</label>
          <input
            id="mQty"
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

        {!isUsed && (
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
        )}

        <button className={`btn btn-block ${saveClass}`} onClick={submit} disabled={saving}>
          {editTx ? t.update : t.save}
        </button>
      </div>
    </Modal>
  );
}
