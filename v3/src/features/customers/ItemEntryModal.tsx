import { useEffect, useRef, useState } from 'react';
import { Modal, ModalHeader } from '../../components/Modal';
import { useQuantityPrice } from '../../hooks/useQuantityPrice';
import { useI18n } from '../../i18n/LanguageContext';
import { updateCustomerItemEntry, updateCustomerItemPayment } from '../../lib/api';
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
 * Correct an item entry — and which form it shows follows what the entry is.
 *
 * A TAKING is the money half of a sale, so it is edited as goods: quantity and
 * price, through the same control the product and material action modals use,
 * because it is the same job. The server rewrites the sale, the stock and the
 * tab line to match.
 *
 * A PAYMENT is money. It is edited as an amount, never as a quantity: cash can
 * cover part of a unit, and asking for a count there would force a fraction of
 * one. The units it clears are worked out from the amount, and only recorded
 * when they come out whole.
 */
export function ItemEntryModal({ open, entry, onClose, onSaved }: ItemEntryModalProps) {
  const { t, formatCurrency, formatNumber, localizeDigits } = useI18n();
  // One quantity and one price field, as in the product and material action
  // modals: the same control doing the same job.
  const {
    qty: quantity,
    price,
    priceMode,
    qtyNum,
    priceNum,
    unitNum,
    totalNum,
    setQty: setQuantity,
    setPrice,
    switchMode,
    seed,
  } = useQuantityPrice();
  const [amount, setAmount] = useState('');
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
    // Seeded on the total, which is what the entry itself is.
    seed(entry.quantity !== null ? String(entry.quantity) : '', entry.amount);
    setAmount(String(entry.amount));
    setError(null);
  }, [open, entry, seed]);

  if (!entry) return null;

  const amountNum = parseFloat(amount);
  const unit = entry.quantity_type ?? '';

  // How many whole units this payment clears, when it clears whole ones at all.
  const paidUnits =
    !taking && entry.price_per_unit ? (amountNum || 0) / entry.price_per_unit : 0;
  const wholeUnits = Number.isInteger(Math.round(paidUnits * 1e6) / 1e6) ? Math.round(paidUnits) : 0;

  const submit = async () => {
    if (taking && qtyNum <= 0) {
      setError(t.enterValidQuantity);
      return;
    }
    if (taking && (price.trim() === '' || priceNum < 0)) {
      setError(t.enterValidPrice);
      return;
    }
    if (!taking && (isNaN(amountNum) || amountNum <= 0)) {
      setError(t.enterValidAmount);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (taking) {
        await updateCustomerItemEntry({
          historyId: entry.id,
          quantity: qtyNum,
          // The API stores the per-unit price, whichever way it was typed.
          pricePerUnit: Math.round(unitNum * 100) / 100,
        });
      } else {
        // A payment is money. The units it covers are worked out from it, and
        // only recorded when they come out whole.
        await updateCustomerItemPayment({ historyId: entry.id, amount: amountNum });
      }
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
      {taking ? (
        <>
          <div className="field">
            <label htmlFor="itemEntryQty">
              {t.quantity}
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
                  ? `${formatCurrency(unitNum)}${unit ? ` / ${unit}` : ''}`
                  : formatCurrency(totalNum)}
              </span>
            </div>
          </div>
        </>
      ) : (
        // A payment is an amount of money. Asking for a quantity here would
        // force a fraction of a unit whenever cash had covered part of one.
        <div className="field">
          <label htmlFor="itemEntryAmount">{t.amount}</label>
          <input
            id="itemEntryAmount"
            className="input"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
          <span className={styles.settleHint}>
            {formatCurrency(entry.price_per_unit ?? 0)}
            {unit ? ` / ${unit}` : ''}
            {wholeUnits > 0
              ? ` · ${localizeDigits(`${formatNumber(wholeUnits)} ${unit}`)}`
              : ''}
          </span>
        </div>
      )}
    </Modal>
  );
}
