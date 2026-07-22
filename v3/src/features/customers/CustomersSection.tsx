import { useCallback, useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/LanguageContext';
import { useLongPress } from '../../hooks/useLongPress';
import { getCustomers } from '../../lib/api';
import type { Customer } from '../../types';
import { CustomerFormModal } from './CustomerFormModal';
import { CustomerHistoryModal } from './CustomerHistoryModal';
import styles from './customers.module.css';

interface CustomersSectionProps {
  open: boolean;
  onClose: () => void;
}

function CustomerRow({
  customer,
  onEdit,
  onHistory,
}: {
  customer: Customer;
  onEdit: () => void;
  onHistory: () => void;
}) {
  const { formatCurrency } = useI18n();
  const press = useLongPress({ onClick: onEdit, onLongPress: onHistory });
  const positive = customer.total_balance >= 0;
  return (
    <div className={styles.row} {...press}>
      <span className={styles.rowName}>{customer.name}</span>
      <span className={`${styles.rowAmount} ${positive ? 'text-positive' : 'text-negative'}`}>
        {positive ? '+' : '-'}
        {formatCurrency(Math.abs(customer.total_balance))}
      </span>
    </div>
  );
}

export function CustomersSection({ open, onClose }: CustomersSectionProps) {
  const { t, formatCurrency } = useI18n();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [query, setQuery] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [formCustomer, setFormCustomer] = useState<Customer | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyName, setHistoryName] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await getCustomers();
      setCustomers(data.customers.map((c) => ({ ...c, total_balance: Number(c.total_balance) })));
      setStatus('ready');
    } catch (err) {
      console.error('Failed to load customers:', err);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  // Escape closes the drawer (modals handle their own Escape).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !formOpen && !historyOpen) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, formOpen, historyOpen, onClose]);

  const totals = useMemo(() => {
    let paid = 0;
    let unpaid = 0;
    for (const c of customers) {
      if (c.total_balance >= 0) paid += c.total_balance;
      else unpaid += c.total_balance;
    }
    return { paid, unpaid: Math.abs(unpaid) };
  }, [customers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? customers.filter((c) => c.name.toLowerCase().includes(q)) : customers;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, query]);

  return (
    <>
      <div className={`${styles.overlay} ${open ? styles.open : ''}`} onClick={onClose} />
      <aside className={`${styles.sidebar} ${open ? styles.open : ''}`} aria-hidden={!open}>
        <div className={styles.header}>
          <h2>{t.customerBalancesTitle}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t.close}>
            <span className="material-symbols-outlined icon-lg">close</span>
          </button>
        </div>

        <div className={styles.topRow}>
          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchCustomers}
          />
          <button
            className="btn btn-primary"
            onClick={() => {
              setFormCustomer(null);
              setFormOpen(true);
            }}
          >
            {t.add}
          </button>
        </div>

        {customers.length > 0 && (
          <div className={styles.totals}>
            <div className={styles.totalItem}>
              <span className={styles.totalLabel}>{t.advancePaid}</span>
              <span className={`${styles.totalValue} text-positive`}>{formatCurrency(totals.paid)}</span>
            </div>
            <div className={`${styles.totalItem} ${styles.right}`}>
              <span className={styles.totalLabel}>{t.totalUnpaid}</span>
              <span className={`${styles.totalValue} text-negative`}>{formatCurrency(totals.unpaid)}</span>
            </div>
          </div>
        )}

        <div className={styles.list}>
          {status === 'error' && <div className="empty-state">{t.failedLoadCustomers}</div>}
          {status === 'ready' && filtered.length === 0 && (
            <div className="empty-state">{customers.length === 0 ? t.noCustomers : t.noMatches}</div>
          )}
          {filtered.map((customer) => (
            <CustomerRow
              key={customer.name}
              customer={customer}
              onEdit={() => {
                setFormCustomer(customer);
                setFormOpen(true);
              }}
              onHistory={() => {
                setHistoryName(customer.name);
                setHistoryOpen(true);
              }}
            />
          ))}
        </div>
      </aside>

      <CustomerFormModal
        open={formOpen}
        customer={formCustomer}
        onClose={() => setFormOpen(false)}
        onChanged={load}
      />

      <CustomerHistoryModal
        open={historyOpen}
        customerName={historyName}
        onClose={() => setHistoryOpen(false)}
        onChanged={load}
      />
    </>
  );
}
