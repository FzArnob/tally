import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n/LanguageContext';
import { Header, HeaderBackButton } from '../../components/Header';
import { ThemeToggle } from '../../components/ThemeToggle';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { deleteCustomer, getCustomers, BOOK_ID } from '../../lib/api';
import type { Customer, CustomerTotals } from '../../types';
import { CustomerFormModal } from './CustomerFormModal';
import { BalanceModal } from './BalanceModal';
import { CustomerHistoryModal } from './CustomerHistoryModal';
import styles from './customers.module.css';

function CustomerRow({
  customer,
  onBalance,
  onHistory,
  onEdit,
  onDelete,
}: {
  customer: Customer;
  onBalance: () => void;
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
    <div className={styles.cRow} onClick={onBalance} role="button" tabIndex={0}>
      <div className={styles.cInfo}>
        <div className={styles.cNameLine}>
          <span className={styles.cName} title={customer.name}>
            {customer.name}
          </span>
          {customer.nickname && (
            <span className={styles.cNick} title={customer.nickname}>
              {customer.nickname}
            </span>
          )}
        </div>
        <span className={styles.cMeta} title={customer.phone || undefined}>
          {last}
          {customer.phone ? ` · ${localizeDigits(customer.phone)}` : ''}
        </span>
      </div>

      <div className={styles.cRight}>
        <span className={`${styles.cAmount} ${positive ? 'text-positive' : 'text-negative'}`}>
          {formatSignedCurrency(customer.total_balance)}
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
  );
}

export function CustomersPage() {
  const { t, formatCurrency } = useI18n();
  const navigate = useNavigate();
  const params = useParams();
  const bookId = Number(params.bookId) || BOOK_ID;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totals, setTotals] = useState<CustomerTotals>({ total_paid: 0, total_unpaid: 0 });
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [query, setQuery] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [formCustomer, setFormCustomer] = useState<Customer | null>(null);
  const [balanceCustomer, setBalanceCustomer] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getCustomers(bookId);
      setCustomers(data.customers);
      setTotals(data.totals);
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
        leading={<HeaderBackButton label={t.back} onClick={() => navigate('/')} />}
        title={t.customerBalancesTitle}
        actions={
          <>
            <ThemeToggle />
            <LanguageSwitcher />
          </>
        }
      />

      <div className={styles.page}>
        <div className={styles.toolbar}>
        <div className={styles.search}>
          <span className="material-symbols-outlined icon-md">search</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchCustomers}
            aria-label={t.searchCustomers}
          />
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setFormCustomer(null);
            setFormOpen(true);
          }}
        >
          <span className="material-symbols-outlined icon-md">add</span>
          {t.add}
        </button>
      </div>

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
            onBalance={() => setBalanceCustomer(c)}
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

      <BalanceModal
        customer={balanceCustomer}
        onClose={() => setBalanceCustomer(null)}
        onChanged={load}
      />

      <CustomerHistoryModal
        customer={historyCustomer}
        onClose={() => setHistoryCustomer(null)}
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
