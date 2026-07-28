import { useCallback, useEffect, useState } from 'react';
import { Modal, ModalHeader } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
import { addCustomerItems, getCustomerItems, settleCustomerItem } from '../../lib/api';
import { ApiError, type CustomerItem, type CustomerItemDraft, type Customer } from '../../types';
import { ItemPickerModal } from './ItemPickerModal';
import styles from './customers.module.css';

interface CustomerItemsModalProps {
  customer: Customer | null; // non-null => open
  onClose: () => void;
  onChanged: () => void;
}

/**
 * A customer's tab: everything they have taken and not yet paid for. The minus
 * button settles one unit (money in, stock untouched — the goods left the shop
 * when the item was added); the plus hands over one more, which is a real sale.
 */
export function CustomerItemsModal({ customer, onClose, onChanged }: CustomerItemsModalProps) {
  const { t, formatCurrency, formatSignedCurrency, formatNumber, localizeDigits } = useI18n();
  const [current, setCurrent] = useState<Customer | null>(null);
  const [items, setItems] = useState<CustomerItem[]>([]);
  const [balance, setBalance] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set while asking how many units of a multi-unit line were paid for.
  const [settling, setSettling] = useState<CustomerItem | null>(null);
  const [settleQty, setSettleQty] = useState('');
  const open = !!customer;

  // Capture the customer on open; keep it through the close animation.
  useEffect(() => {
    if (!customer) return;
    setCurrent(customer);
    setBalance(customer.total_balance);
    setError(null);
    let active = true;
    setStatus('loading');
    getCustomerItems(customer.id)
      .then((data) => {
        if (!active) return;
        setItems(data.items);
        setStatus('ready');
      })
      .catch((err) => {
        console.error('Failed to load customer items:', err);
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [customer]);

  // Both endpoints answer with the full list plus the new balance, so one
  // handler keeps the sheet, the row list and the page behind it in step.
  const applyResult = useCallback(
    (result: { items: CustomerItem[]; new_balance: number }) => {
      setItems(result.items);
      setBalance(result.new_balance);
      onChanged();
    },
    [onChanged],
  );

  const fail = (err: unknown, fallback: string) => {
    if (err instanceof ApiError && (err.code === 'insufficient_stock' || err.code === 'validation')) {
      setError(err.message);
    } else {
      console.error(fallback, err);
      setError(fallback);
    }
  };

  const settle = async (item: CustomerItem, quantity: number) => {
    if (busyId) return;
    setBusyId(item.id);
    setError(null);
    try {
      applyResult(await settleCustomerItem(item.id, quantity));
      setSettling(null);
    } catch (err) {
      fail(err, t.failedSettleItem);
    } finally {
      setBusyId(null);
    }
  };

  /**
   * Always confirms — a stray tap must never book a payment. A single unit only
   * needs a yes/no; anything more asks how many, prefilled with the whole line.
   */
  const onPaid = (item: CustomerItem) => {
    setSettling(item);
    setSettleQty(String(item.quantity));
  };

  const addFromPicker = async (drafts: CustomerItemDraft[]) => {
    if (!current) return;
    setError(null);
    try {
      applyResult(await addCustomerItems(current.id, drafts));
      setPickerOpen(false);
    } catch (err) {
      fail(err, t.failedAddItems);
      setPickerOpen(false); // surface the error on the sheet behind the picker
    }
  };

  const outstanding = items.reduce((sum, i) => sum + i.total_amount, 0);
  const positive = balance >= 0;

  // Live readout for the settle dialog: what the typed quantity comes to. A
  // single unit skips the field — there is nothing to choose, only to confirm.
  const singleUnit = !!settling && settling.quantity <= 1;
  const settleNum = parseFloat(settleQty) || 0;
  const settleValid = !!settling && settleNum > 0 && settleNum <= settling.quantity;
  const settleAmount = settling ? settleNum * settling.price_per_unit : 0;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        labelledBy="itemsTitle"
        header={
          <ModalHeader
            title={
              <div className={styles.balHeaderInfo}>
                <span className={styles.balName}>
                  <span className={styles.cName} title={current?.name}>
                    {current?.name}
                  </span>
                  {current?.nickname ? (
                    <span className={styles.cNick}>{current.nickname}</span>
                  ) : null}
                </span>
                <span
                  className={`${styles.balHeaderAmount} ${positive ? 'text-positive' : 'text-negative'}`}
                >
                  {formatSignedCurrency(balance)}
                </span>
              </div>
            }
            titleId="itemsTitle"
            onClose={onClose}
            closeLabel={t.close}
          />
        }
        footer={
          <>
            {error && <div className={`${styles.formError} ${styles.itemsError}`}>{error}</div>}
            <button
              className="btn btn-primary btn-block btn-margin"
              onClick={() => setPickerOpen(true)}
            >
              <span className="material-symbols-outlined icon-md">add</span>
              {t.addItems}
            </button>
          </>
        }
      >
        {status === 'ready' && items.length > 0 && (
          <div className={styles.itemsTotal}>
            <span>{t.unpaidItems}</span>
            <span className={`${styles.itemsTotalValue} text-negative`}>
              {formatCurrency(outstanding)}
            </span>
          </div>
        )}

        <div className={styles.itemList}>
          {status === 'loading' && <div className="empty-state">…</div>}
          {status === 'error' && <div className="empty-state">{t.failedLoadItems}</div>}
          {status === 'ready' && items.length === 0 && (
            <div className="empty-state">
              {t.noUnpaidItems}
              <br />
              {t.addFirstItem}
            </div>
          )}

          {items.map((item) => (
            <div key={item.id} className={styles.itemRow}>
              <div className={styles.line}>
                <span className={styles.itemName} title={item.item_name}>
                  {item.item_name}
                </span>
                <span className={styles.itemTotal}>{formatCurrency(item.total_amount)}</span>
              </div>

              <div className={styles.line}>
                <span className={styles.itemPrice}>
                  {formatCurrency(item.price_per_unit)} / {item.quantity_type}
                </span>
                <div className={styles.itemRight}>
                  <span className={styles.itemQty}>
                    {localizeDigits(`${formatNumber(item.quantity)} ${item.quantity_type}`)}
                  </span>
                  <button
                    className={styles.paidBtn}
                    title={t.markPaid}
                    disabled={busyId === item.id}
                    onClick={() => onPaid(item)}
                  >
                    <span className="material-symbols-outlined icon-sm">check</span>
                    {t.paid}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <ItemPickerModal
        open={pickerOpen}
        bookId={current?.book_id ?? 0}
        onConfirm={addFromPicker}
        onClose={() => setPickerOpen(false)}
      />

      {/* Confirm the payment — a yes/no for one unit, a quantity for several. */}
      <Modal open={!!settling} onClose={() => setSettling(null)} centered>
        <h3 className={styles.settleTitle}>{t.markPaid}</h3>
        <p className={styles.settleName}>{settling?.item_name}</p>

        {singleUnit ? (
          <p className={styles.settleMessage}>
            {t.markPaidConfirm} <b>{formatCurrency(settleAmount)}</b>
          </p>
        ) : (
          <div className="field">
            <label htmlFor="settleQty">{t.quantity}</label>
            <input
              id="settleQty"
              className="input"
              type="number"
              inputMode="decimal"
              min="0"
              max={settling?.quantity}
              step="any"
              value={settleQty}
              onChange={(e) => setSettleQty(e.target.value)}
              autoFocus
            />
            <span className={styles.settleHint}>
              {t.outstandingLabel}{' '}
              {settling
                ? localizeDigits(`${formatNumber(settling.quantity)} ${settling.quantity_type}`)
                : ''}{' '}
              · {formatCurrency(settleAmount)}
            </span>
          </div>
        )}

        <div className={styles.settleActions}>
          <button
            className="btn btn-secondary btn-block"
            onClick={() => setSettling(null)}
            disabled={!!busyId}
          >
            {t.cancel}
          </button>
          <button
            className="btn btn-primary btn-block"
            onClick={() => settling && void settle(settling, settleNum)}
            disabled={!!busyId || !settleValid}
          >
            {t.paid}
          </button>
        </div>
      </Modal>
    </>
  );
}
