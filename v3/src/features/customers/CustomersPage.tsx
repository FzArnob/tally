import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n/LanguageContext';
import { Header, HeaderBackButton } from '../../components/Header';
import { UserMenu } from '../../auth/UserMenu';
import { Toolbar } from '../../components/Toolbar';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { deleteCustomer, getCustomers } from '../../lib/api';
import { creditBreach, fill, type CreditBreach } from '../../lib/credit';
import type { BalanceHistoryEntry, CreditLimits, Customer, CustomerTotals } from '../../types';
import { CreditLimitsModal } from './CreditLimitsModal';
import { CustomerFormModal } from './CustomerFormModal';
import { CashEntryModal } from './CashEntryModal';
import { ItemEntryModal } from './ItemEntryModal';
import { CustomerItemsModal } from './CustomerItemsModal';
import { CustomerHistoryModal } from './CustomerHistoryModal';
import styles from './customers.module.css';

function CustomerRow({
  customer,
  breach,
  onItems,
  onHistory,
  onEdit,
  onDelete,
}: {
  customer: Customer;
  /** Set when this customer is past the book's rule; drives the warning mark. */
  breach: CreditBreach | null;
  onItems: () => void;
  onHistory: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t, formatSignedCurrency, formatTimeShort, localizeDigits } = useI18n();
  const positive = customer.total_balance >= 0;
  const last = customer.last_transaction_time
    ? localizeDigits(formatTimeShort(customer.last_transaction_time))
    : t.noActivity;

  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

  return (
    <div className={styles.cRow} onClick={onItems} role="button" tabIndex={0}>
      <div className={styles.lines}>
        <div className={styles.line}>
          <div className={styles.cNameLine}>
            {breach && (
              // Ahead of the name, so the reader meets it before they read who
              // it is about. The title carries the reason for a pointer; the
              // dialog on opening the tab is what states it properly.
              <span
                className={`material-symbols-outlined icon-md ${styles.cWarn}`}
                role="img"
                aria-label={t.creditWarningTitle}
                title={t.creditWarningTitle}
              >
                warning
              </span>
            )}
            <span className={styles.cName} title={customer.name}>
              {customer.name}
            </span>
            {customer.nickname && (
              <span className={styles.cNick} title={customer.nickname}>
                {customer.nickname}
              </span>
            )}
          </div>
          <span className={`${styles.cAmount} ${positive ? 'text-positive' : 'text-negative'}`}>
            {formatSignedCurrency(customer.total_balance)}
          </span>
        </div>

        <div className={styles.line}>
          <span className={styles.cMeta} title={customer.phone || undefined}>
            {last}
            {customer.phone ? ` · ${localizeDigits(customer.phone)}` : ''}
          </span>
          <div className={styles.cActions} onClick={stop}>
            <button className="ghost-btn" aria-label={t.history} onClick={onHistory}>
              <span className="material-symbols-outlined icon-md">history</span>
            </button>
            <button className="ghost-btn" aria-label={t.editCustomer} onClick={onEdit}>
              <span className="material-symbols-outlined icon-md">edit</span>
            </button>
            <button className="ghost-btn" aria-label={t.deleteCustomer} onClick={onDelete}>
              <span className="material-symbols-outlined icon-md">delete</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CustomersPage() {
  const { t, formatCurrency, formatNumber, localizeDigits } = useI18n();
  const navigate = useNavigate();
  const params = useParams();
  const bookId = params.bookId ?? '';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totals, setTotals] = useState<CustomerTotals>({ total_paid: 0, total_unpaid: 0 });
  const [limits, setLimits] = useState<CreditLimits>({ credit_limit: null, credit_days: null });
  const [limitsOpen, setLimitsOpen] = useState(false);
  // A flagged customer whose tab was tapped, held while the warning is read.
  const [warnCustomer, setWarnCustomer] = useState<Customer | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [query, setQuery] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [formCustomer, setFormCustomer] = useState<Customer | null>(null);
  const [itemsCustomer, setItemsCustomer] = useState<Customer | null>(null);
  // The entry a history edit handed over, and whose tab it belongs to.
  const [editEntry, setEditEntry] = useState<BalanceHistoryEntry | null>(null);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  // Bumped after an edit so the history list underneath re-pulls itself.
  const [historyReload, setHistoryReload] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getCustomers(bookId);
      setCustomers(data.customers);
      setTotals(data.totals);
      setLimits(data.limits);
      setStatus('ready');
    } catch (err) {
      console.error('Failed to load customers:', err);
      setStatus('error');
    }
  }, [bookId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.nickname.toLowerCase().includes(q) ||
        c.phone.includes(q),
    );
  }, [customers, query]);

  // Who is past the book's rule, worked out once for the whole list rather than
  // per row, since every row measures against the same two numbers.
  const breaches = useMemo(() => {
    const map = new Map<string, CreditBreach>();
    for (const c of customers) {
      const breach = creditBreach(c, limits);
      if (breach) map.set(c.id, breach);
    }
    return map;
  }, [customers, limits]);

  /**
   * Why this customer is flagged, in words. Both halves are said when both are
   * true: someone can be over the amount AND late with it, and whoever is
   * deciding whether to serve them wants both facts, not the first one.
   */
  const breachReason = (customer: Customer): string => {
    const breach = breaches.get(customer.id);
    if (!breach) return '';
    const owed = formatCurrency(breach.owed);
    const parts: string[] = [];
    if (breach.overLimit && limits.credit_limit != null) {
      parts.push(fill(t.creditOverLimitReason, { owed, limit: formatCurrency(limits.credit_limit) }));
    }
    if (breach.overdue && limits.credit_days != null && breach.daysOwing != null) {
      const days = localizeDigits(`${formatNumber(breach.daysOwing)} ${t.creditDaysUnit}`);
      const allowed = localizeDigits(`${formatNumber(limits.credit_days)} ${t.creditDaysUnit}`);
      parts.push(fill(t.creditOverdueReason, { owed, days, allowed }));
    }
    return parts.join(' ');
  };

  /**
   * Opening a tab is where an entry gets made, so it is where a warning belongs.
   * A flagged customer's sheet waits behind the dialog; anyone else's opens
   * straight away, because a warning nobody needs is one nobody reads.
   */
  const openTab = (customer: Customer) => {
    if (breaches.has(customer.id)) setWarnCustomer(customer);
    else setItemsCustomer(customer);
  };

  // Editing a history entry hands off to whichever editor fits what it is:
  // cash is an amount, goods are a quantity of something. The history stays
  // open underneath, so closing the editor puts the reader back where they were.
  const editFromHistory = (entry: BalanceHistoryEntry) => {
    setEditCustomer(historyCustomer);
    setEditEntry(entry);
  };

  /**
   * After an entry is corrected: the page's balances, and the history list
   * behind the editor, which the server has just re-run end to end (an edit
   * moves every running balance below it).
   */
  const entrySaved = () => {
    void load();
    setHistoryReload((n) => n + 1);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteCustomer(pendingDelete.id);
      setPendingDelete(null);
      await load();
    } catch (err) {
      console.error('Failed to delete customer:', err);
      alert(t.failedDeleteCustomer);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Header
        leading={<HeaderBackButton label={t.back} onClick={() => navigate(`/${bookId}/products`)} />}
        title={t.customerBalancesTitle}
        actions={<UserMenu />}
      />

      <div className={styles.page}>
        <Toolbar
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder={t.searchCustomers}
          addLabel={t.add}
          onAdd={() => {
            setFormCustomer(null);
            setFormOpen(true);
          }}
          actions={
            <button
              className="icon-btn"
              aria-label={t.creditLimitsAction}
              title={t.creditLimitsAction}
              onClick={() => setLimitsOpen(true)}
            >
              <span className="material-symbols-outlined icon-lg">credit_score</span>
            </button>
          }
        />

      {customers.length > 0 && (
        <div className={styles.totals}>
          <div className={styles.totalItem}>
            <span className={styles.totalLabel}>{t.advancePaid}</span>
            <span className={`${styles.totalValue} text-positive`}>
              {formatCurrency(totals.total_paid)}
            </span>
          </div>
          <div className={`${styles.totalItem} ${styles.right}`}>
            <span className={styles.totalLabel}>{t.totalUnpaid}</span>
            <span className={`${styles.totalValue} text-negative`}>
              {formatCurrency(totals.total_unpaid)}
            </span>
          </div>
        </div>
      )}

      <div className={styles.pageList}>
        {status === 'loading' && <div className="empty-state">…</div>}
        {status === 'error' && <div className="empty-state">{t.failedLoadCustomers}</div>}
        {status === 'ready' && filtered.length === 0 && (
          <div className="empty-state">{customers.length === 0 ? t.noCustomers : t.noMatches}</div>
        )}
        {filtered.map((c) => (
          <CustomerRow
            key={c.id}
            customer={c}
            breach={breaches.get(c.id) ?? null}
            onItems={() => openTab(c)}
            onHistory={() => setHistoryCustomer(c)}
            onEdit={() => {
              setFormCustomer(c);
              setFormOpen(true);
            }}
            onDelete={() => setPendingDelete(c)}
          />
        ))}
      </div>

      <CustomerFormModal
        open={formOpen}
        customer={formCustomer}
        bookId={bookId}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />

      <CreditLimitsModal
        open={limitsOpen}
        bookId={bookId}
        limits={limits}
        onClose={() => setLimitsOpen(false)}
        onSaved={setLimits}
      />

      {/* Stated before the tab opens, not after an entry is made: the point is
          to inform the decision, and by then it has been taken. Overrulable —
          letting a regular go further is the shopkeeper's call, not the app's. */}
      <ConfirmDialog
        open={!!warnCustomer}
        title={t.creditWarningTitle}
        message={warnCustomer ? `${warnCustomer.name} — ${breachReason(warnCustomer)}` : ''}
        confirmLabel={t.continueAction}
        tone="warning"
        onConfirm={() => {
          setItemsCustomer(warnCustomer);
          setWarnCustomer(null);
        }}
        onCancel={() => setWarnCustomer(null)}
      />

      <CustomerItemsModal
        customer={itemsCustomer}
        onClose={() => setItemsCustomer(null)}
        onChanged={load}
      />

      <CashEntryModal
        open={editEntry?.source === 'cash'}
        customer={editCustomer}
        type={editEntry?.type ?? 'unpaid'}
        editEntry={editEntry}
        onClose={() => setEditEntry(null)}
        onSaved={entrySaved}
      />

      <ItemEntryModal
        open={editEntry?.source === 'item'}
        entry={editEntry}
        onClose={() => setEditEntry(null)}
        onSaved={entrySaved}
      />

      <CustomerHistoryModal
        customer={historyCustomer}
        reloadKey={historyReload}
        onClose={() => setHistoryCustomer(null)}
        onEdit={editFromHistory}
        onChanged={load}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title={t.deleteCustomer}
        message={t.deleteCustomerConfirm}
        confirmLabel={t.deleteAction}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
        busy={deleting}
      />
      </div>
    </>
  );
}
