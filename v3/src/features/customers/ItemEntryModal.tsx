import { useEffect, useRef, useState } from 'react';
import { Modal, ModalHeader } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
import { updateCustomerItemEntry } from '../../lib/api';
import { ApiError, type BalanceHistoryEntry } from '../../types';
import styles from './customers.module.css';

interface ItemEntryModalProps {
  open: boolean;
  /** The item entry being corrected — a taking (unpaid) or a payment (paid). */
  entry: BalanceHistoryEntry | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Correct an item entry. Goods are edited as goods, by quantity — never as a
 * bare amount, because the entry is only the money half of a movement that also
 * has a sale and an outstanding line behind it. The server moves all three.
 *
 * A taking may also be re-priced. A payment may not: its price is whatever was
 * agreed when the goods went onto the tab, so only the quantity paid for is in
 * question.
 */
export function ItemEntryModal({ open, entry, onClose, onSaved }: ItemEntryModalProps) {
  const { t, formatCurrency, formatNumber, localizeDigits } = useI18n();
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const taking = entry?.type === 'unpaid';

  // Seed on subject change only, so reopening the same entry keeps what was
  // typed. Cleared on a save.
  const seededFor = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !entry) return;
    if (seededFor.current === entry.id) return;
    seededFor.current = entry.id;
    setQuantity(entry.quantity !== null ? String(entry.quantity) : '');
    setPrice(entry.price_per_unit !== null ? String(entry.price_per_unit) : '');
    setError(null);
  }, [open, entry]);

  if (!entry) return null;

  const qtyNum = parseFloat(quantity);
  const priceNum = taking ? parseFloat(price) : (entry.price_per_unit ?? 0);
  const total = (isNaN(qtyNum) ? 0 : qtyNum) * (isNaN(priceNum) ? 0 : priceNum);
  const unit = entry.quantity_type ?? '';

  const submit = async () => {
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setError(t.enterValidQuantity);
      return;
    }
    if (taking && (isNaN(priceNum) || priceNum < 0)) {
      setError(t.enterValidAmount);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateCustomerItemEntry({
        historyId: entry.id,
        quantity: qtyNum,
        // Only a taking carries a price; leaving it out settles at the agreed one.
        ...(taking ? { pricePerUnit: priceNum } : {}),
      });
      seededFor.current = null;
      onSaved();
      onClose();
    } catch (err) {
      // The server refuses edits that would move money already banked, or more
      // units than were ever taken — those messages are the useful ones.
      if (err instanceof ApiError && (err.code === 'validation' || err.code === 'settled' || err.code === 'insufficient_stock')) {
        setError(err.message);
      } else {
        console.error('Failed to save item entry:', err);
        setError(t.failedSaveEntry);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="itemEntryTitle"
      header={
        <ModalHeader
          title={taking ? t.editItemEntry : t.editPayment}
          titleId="itemEntryTitle"
          onClose={onClose}
          closeLabel={t.close}
          extra={<span className={styles.entryItemName}>{entry.item_name}</span>}
        />
      }
      footer={
        <>
          {error && <div className={`${styles.formError} ${styles.itemsError}`}>{error}</div>}
          <button
            className="btn btn-primary btn-block btn-margin"
            onClick={submit}
            disabled={saving}
          >
            {t.update}
          </button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="itemEntryQty">
          {taking ? t.quantity : t.quantityPaid}
          {unit ? ` (${unit})` : ''}
        </label>
        <input
          id="itemEntryQty"
          className="input"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          autoFocus
        />
      </div>

      {taking ? (
        <div className="field">
          <label htmlFor="itemEntryPrice">{t.sellingPrice}</label>
          <input
            id="itemEntryPrice"
            className="input"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
      ) : (
        <p className={styles.settleHint}>
          {formatCurrency(entry.price_per_unit ?? 0)}
          {unit ? ` / ${unit}` : ''}
        </p>
      )}

      <div className={styles.itemsTotal}>
        <span>{t.total}</span>
        <span className={`${styles.itemsTotalValue} ${taking ? 'text-negative' : 'text-positive'}`}>
          {formatCurrency(total)}
        </span>
      </div>

      {qtyNum > 0 && unit && (
        <p className={styles.settleHint}>
          {localizeDigits(`${formatNumber(qtyNum)} ${unit}`)} × {formatCurrency(priceNum || 0)}
        </p>
      )}
    </Modal>
  );
}
