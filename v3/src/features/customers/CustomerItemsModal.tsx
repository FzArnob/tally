import { useCallback, useEffect, useState } from 'react';
import { Modal, ModalHeader } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
import {
  addCustomerItems,
  getCustomer,
  getCustomerItems,
  settleCustomerItem,
} from '../../lib/api';
import {
  ApiError,
  type BalanceType,
  type CustomerItem,
  type CustomerItemDraft,
  type CustomerStats,
  type Customer,
} from '../../types';
import { CashEntryModal } from './CashEntryModal';
import { ItemPickerModal } from './ItemPickerModal';
import styles from './customers.module.css';

interface CustomerItemsModalProps {
  customer: Customer | null; // non-null => open
  onClose: () => void;
  onChanged: () => void;
}

const emptyStats: CustomerStats = {
  total_balance: 0,
  cash_balance: 0,
  items_due: 0,
  total_unpaid: 0,
  total_paid_back: 0,
};

/** Pull the tab figures off a customer row. */
function statsOf(c: Customer): CustomerStats {
  return {
    total_balance: c.total_balance,
    cash_balance: c.cash_balance,
    items_due: c.items_due,
    total_unpaid: c.total_unpaid,
    total_paid_back: c.total_paid_back,
  };
}

/**
 * Whole units of a line not yet paid off. Payment is tracked in money — cash
 * can eat into a unit without clearing it — so a unit counts as outstanding
 * until the last paisa of it is covered. Rounding up is what keeps this a
 * count of goods rather than a fraction: three taken with two-and-a-bit paid
 * for still leaves one on the tab.
 */
function unitsOwed(item: CustomerItem): number {
  if (item.price_per_unit <= 0) return item.quantity;
  return Math.min(item.quantity, Math.ceil(item.remaining / item.price_per_unit - 0.0000001));
}

/**
 * A customer's tab: the cash side and the goods side of what they owe, in one
 * sheet. Cash is borrowed or handed back with the two buttons at the top; goods
 * are taken with "Add items" and cleared line by line with Paid (money in,
 * stock untouched — the goods left the shop when the item was added).
 */
export function CustomerItemsModal({ customer, onClose, onChanged }: CustomerItemsModalProps) {
  const { t, formatCurrency, formatSignedCurrency, formatNumber, localizeDigits } = useI18n();
  const [current, setCurrent] = useState<Customer | null>(null);
  const [items, setItems] = useState<CustomerItem[]>([]);
  const [stats, setStats] = useState<CustomerStats>(emptyStats);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set while asking how many units of a multi-unit line were paid for.
  const [settling, setSettling] = useState<CustomerItem | null>(null);
  const [settleQty, setSettleQty] = useState('');
  // Which cash button was tapped; null while the cash sheet is closed.
  const [cashType, setCashType] = useState<BalanceType | null>(null);
  const open = !!customer;

  // Capture the customer on open; keep it through the close animation.
  useEffect(() => {
    if (!customer) return;
    setCurrent(customer);
    setStats(statsOf(customer));
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

  // Both item endpoints answer with the full list plus the restated splits, so
  // one handler keeps the sheet, the row list and the page behind it in step.
  const applyResult = useCallback(
    (result: { items: CustomerItem[]; totals: CustomerStats }) => {
      setItems(result.items);
      setStats(result.totals);
      onChanged();
    },
    [onChanged],
  );

  /**
   * Restate the sheet after cash was booked. Cash moves goods too — a repayment
   * runs down the open lines — so the list is reloaded alongside the figures,
   * and lines the money cleared drop out of it.
   */
  const reloadAfterCash = useCallback(async () => {
    if (!current) return;
    onChanged();
    try {
      const [{ customer: fresh }, itemData] = await Promise.all([
        getCustomer(current.id),
        getCustomerItems(current.id),
      ]);
      setStats(statsOf(fresh));
      setItems(itemData.items);
    } catch (err) {
      console.error('Failed to refresh the tab:', err);
    }
  }, [current, onChanged]);

  const fail = (err: unknown, fallback: string) => {
    if (err instanceof ApiError && (err.code === 'insufficient_stock' || err.code === 'validation')) {
      setError(err.message);
    } else {
      console.error(fallback, err);
      setError(fallback);
    }
  };

  /**
   * `units` is a whole count, or undefined to clear the line outright. The
   * server turns it into money — paying for the last unit of a line cash has
   * already part-covered costs only the remainder.
   */
  const settle = async (item: CustomerItem, units?: number) => {
    if (busyId) return;
    setBusyId(item.id);
    setError(null);
    try {
      applyResult(await settleCustomerItem(item.id, units));
      setSettling(null);
    } catch (err) {
      fail(err, t.failedSettleItem);
    } finally {
      setBusyId(null);
    }
  };

  /**
   * Always confirms — a stray tap must never book a payment. One unit left only
   * needs a yes/no; more than that asks how many, offering the whole line.
   */
  const onPaid = (item: CustomerItem) => {
    setSettling(item);
    setSettleQty(String(unitsOwed(item)));
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

  const positive = stats.total_balance >= 0;
  // Cash paid ahead reads as an advance rather than a debt of "-x".
  const cashAhead = stats.cash_balance > 0;

  // Live readout for the settle dialog. One unit left skips the field — there
  // is nothing to choose, only to confirm. The money mirrors the server's rule:
  // whole units at the agreed price, never more than the line still owes.
  const settleLeft = settling ? unitsOwed(settling) : 0;
  const singleUnit = settleLeft <= 1;
  const settleNum = Math.floor(parseFloat(settleQty) || 0);
  const settleValid = !!settling && settleNum > 0 && settleNum <= settleLeft;
  const settleAmount = settling
    ? Math.min(settleNum * settling.price_per_unit, settling.remaining)
    : 0;

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
                  {formatSignedCurrency(stats.total_balance)}
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
        {/* Cash first: the two directions money moves without any goods. Both
            wear the active look, since neither is a choice already made — they
            are two live actions, each in the colour it books. */}
        <div className={`type-toggle ${styles.cashActions}`}>
          <button
            type="button"
            className="type-btn type-btn-active type-expense"
            onClick={() => setCashType('unpaid')}
          >
            <span className="material-symbols-outlined icon-md">south_west</span>
            {t.borrowedCash}
          </button>
          <button
            type="button"
            className="type-btn type-btn-active type-income"
            onClick={() => setCashType('paid')}
          >
            <span className="material-symbols-outlined icon-md">north_east</span>
            {t.cashPaidBack}
          </button>
        </div>

        <div className={styles.tabStats}>
          {/* Lifetime totals: everything ever put on the tab, and everything
              ever paid off it. Not a split of the balance — they stand apart
              from it, so they get their own line and the two arrows. */}
          <div className={styles.tabTotals}>
            <span className={styles.tabTotal}>
              <span className="material-symbols-outlined icon-sm text-negative">south_west</span>
              <span className={styles.tabStatLabel}>{t.tabTotalUnpaid}</span>
              <span className="text-negative">{formatCurrency(stats.total_unpaid)}</span>
            </span>
            <span className={styles.tabTotal}>
              <span className="material-symbols-outlined icon-sm text-positive">north_east</span>
              <span className={styles.tabStatLabel}>{t.tabTotalPaid}</span>
              <span className="text-positive">{formatCurrency(stats.total_paid_back)}</span>
            </span>
          </div>

          {/* What still stands today — these two are the balance. */}
          <div className={styles.tabSplit}>
            <div className={styles.tabStat}>
              <span className={styles.tabStatLabel}>{cashAhead ? t.cashAdvance : t.unpaidCash}</span>
              <span
                className={`${styles.tabStatValue} ${cashAhead ? 'text-positive' : 'text-negative'}`}
              >
                {formatCurrency(Math.abs(stats.cash_balance))}
              </span>
            </div>
            <div className={styles.tabStat}>
              <span className={styles.tabStatLabel}>{t.unpaidItems}</span>
              <span className={`${styles.tabStatValue} text-negative`}>
                {formatCurrency(stats.items_due)}
              </span>
            </div>
          </div>
        </div>

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

          {items.map((item) => {
            // Part-paid lines carry a bar along the bottom: green for what is
            // covered, red for what is left, so the split reads at a glance.
            const part = item.total_amount > 0 ? item.paid_amount / item.total_amount : 0;
            const partly = item.paid_amount > 0;
            // Units still on the tab, not units taken: pay for two of three and
            // the row says one. Whole units paid for are shown beside them.
            const owed = unitsOwed(item);
            const cleared = item.quantity - owed;
            return (
              <div key={item.id} className={styles.itemRow}>
                <div className={styles.line}>
                  <span className={styles.itemName} title={item.item_name}>
                    {item.item_name}
                  </span>
                  {/* What is still owed leads; the full price only matters as
                      context once part of it has been paid. */}
                  <span className={`${styles.itemTotal} text-negative`}>
                    {formatCurrency(item.remaining)}
                  </span>
                </div>

                <div className={styles.line}>
                  <span className={styles.itemPrice}>
                    {formatCurrency(item.price_per_unit)} / {item.quantity_type}
                  </span>
                  <div className={styles.itemRight}>
                    <span className={styles.itemQty}>
                      {localizeDigits(`${formatNumber(owed)} ${item.quantity_type}`)}
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

                {partly && (
                  <div className={styles.line}>
                    <span className={styles.itemPaid}>
                      {t.paidBack}: {formatCurrency(item.paid_amount)}
                      {/* Whole units already settled, so "2 of 3 paid for"
                          reads off the row without any arithmetic. */}
                      {cleared > 0
                        ? ` · ${localizeDigits(
                            `${formatNumber(cleared)}/${formatNumber(item.quantity)} ${item.quantity_type}`,
                          )}`
                        : ''}
                    </span>
                    <span className={styles.itemPrice}>
                      {t.of} {formatCurrency(item.total_amount)}
                    </span>
                  </div>
                )}

                <div
                  className={styles.itemProgress}
                  style={{ ['--paid-share' as string]: `${Math.round(part * 100)}%` }}
                  aria-hidden="true"
                />
              </div>
            );
          })}
        </div>
      </Modal>

      <ItemPickerModal
        open={pickerOpen}
        bookId={current?.book_id ?? ''}
        onConfirm={addFromPicker}
        onClose={() => setPickerOpen(false)}
      />

      <CashEntryModal
        open={!!cashType}
        customer={current}
        type={cashType ?? 'unpaid'}
        onClose={() => setCashType(null)}
        onSaved={reloadAfterCash}
      />

      {/* Confirm the payment — a yes/no for one unit, a quantity for several. */}
      <Modal open={!!settling} onClose={() => setSettling(null)} centered>
        <h3 className={styles.settleTitle}>{t.markPaid}</h3>
        <p className={styles.settleName}>{settling?.item_name}</p>

        {singleUnit ? (
          // Nothing to choose: this clears the line for exactly what it owes.
          <p className={styles.settleMessage}>
            {t.markPaidConfirm} <b>{formatCurrency(settling?.remaining ?? 0)}</b>
          </p>
        ) : (
          <div className="field">
            <label htmlFor="settleQty">{t.quantity}</label>
            {/* Whole units only — a payment for part of one is money, not goods,
                and belongs on the Cash paid button. */}
            <input
              id="settleQty"
              className="input"
              type="number"
              inputMode="numeric"
              min="1"
              max={settleLeft}
              step="1"
              value={settleQty}
              onChange={(e) => setSettleQty(e.target.value)}
              autoFocus
            />
            {/* What is left to pay for, in units and in money. The money can be
                less than units × price once cash has eaten into the last one. */}
            <span className={styles.settleHint}>
              {t.outstandingLabel}{' '}
              {settling
                ? localizeDigits(`${formatNumber(settleLeft)} ${settling.quantity_type}`)
                : ''}{' '}
              · {formatCurrency(settling?.remaining ?? 0)}
              {settleValid && settleNum < settleLeft ? ` → ${formatCurrency(settleAmount)}` : ''}
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
            // One unit left clears the line outright, so no count is sent and
            // the server charges exactly what is owed.
            onClick={() => settling && void settle(settling, singleUnit ? undefined : settleNum)}
            disabled={!!busyId || (!singleUnit && !settleValid)}
          >
            {t.paid}
          </button>
        </div>
      </Modal>
    </>
  );
}
