import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/LanguageContext';
import { Header, CategoriesButton } from '../../components/Header';
import { ThemeToggle } from '../../components/ThemeToggle';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { BookSwitcher } from '../../books/BookSwitcher';
import { Toolbar } from '../../components/Toolbar';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { deletePersonalTransaction, getCategories, getTransactions } from '../../lib/api';
import type { Book, Category, PersonalTransaction, TransactionTotals } from '../../types';
import { TransactionFormModal } from './TransactionFormModal';
import styles from './transactions.module.css';

function TransactionRow({
  tx,
  onEdit,
  onDelete,
}: {
  tx: PersonalTransaction;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t, formatSignedCurrency, formatTimeShort, localizeDigits } = useI18n();
  const income = tx.type === 'income';

  return (
    <div className={styles.row}>
      <div className={styles.info}>
        <span className={`${styles.amount} ${income ? 'text-positive' : 'text-negative'}`}>
          {formatSignedCurrency(tx.signed_amount)}
        </span>
        {tx.note && (
          <span className={styles.note} title={tx.note}>
            {tx.note}
          </span>
        )}
        <span className={styles.meta}>
          {income ? t.income : t.expense}
          {' · '}
          {localizeDigits(formatTimeShort(tx.timestamp))}
        </span>
      </div>

      <div className={styles.right}>
        <span
          className={`${styles.chip} ${income ? styles.chipIncome : styles.chipExpense}`}
          title={tx.category_name || undefined}
        >
          {tx.category_name || '—'}
        </span>
        <div className={styles.actions}>
          <button className="ghost-btn" aria-label={t.editTransaction} onClick={onEdit}>
            <span className="material-symbols-outlined icon-md">edit</span>
          </button>
          <button className="ghost-btn" aria-label={t.deleteTransaction} onClick={onDelete}>
            <span className="material-symbols-outlined icon-md">delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function TransactionsPage({ book }: { book: Book }) {
  const { t, formatCurrency } = useI18n();
  const navigate = useNavigate();
  const bookId = book.id;

  const [transactions, setTransactions] = useState<PersonalTransaction[]>([]);
  const [totals, setTotals] = useState<TransactionTotals>({ income: 0, expense: 0, balance: 0 });
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [query, setQuery] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [formTx, setFormTx] = useState<PersonalTransaction | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PersonalTransaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [txData, catData] = await Promise.all([getTransactions(bookId), getCategories(bookId)]);
      setTransactions(txData.transactions);
      setTotals(txData.totals);
      setCategories(catData.categories);
      setStatus('ready');
    } catch (err) {
      console.error('Failed to load transactions:', err);
      setStatus('error');
    }
  }, [bookId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      (tx) =>
        tx.note.toLowerCase().includes(q) ||
        tx.category_name.toLowerCase().includes(q) ||
        tx.type.includes(q),
    );
  }, [transactions, query]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deletePersonalTransaction(pendingDelete.id);
      setPendingDelete(null);
      await load();
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      alert(t.failedDeleteTransaction);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Header
        leading={<BookSwitcher current={book} />}
        actions={
          <>
            <ThemeToggle />
            <LanguageSwitcher />
            <CategoriesButton
              label={t.categories}
              onClick={() => navigate(`/${bookId}/categories`)}
            />
          </>
        }
      />

      <div className={styles.page}>
        <Toolbar
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder={t.searchTransactions}
          addLabel={t.add}
          onAdd={() => {
            setFormTx(null);
            setFormOpen(true);
          }}
        />

        {transactions.length > 0 && (
          <div className={styles.summary}>
            <div className={styles.sumItem}>
              <span className={styles.sumLabel}>{t.income}</span>
              <span className={`${styles.sumValue} text-positive`}>
                {formatCurrency(totals.income)}
              </span>
            </div>
            <div className={styles.sumItem}>
              <span className={styles.sumLabel}>{t.expense}</span>
              <span className={`${styles.sumValue} text-negative`}>
                {formatCurrency(totals.expense)}
              </span>
            </div>
            <div className={styles.sumItem}>
              <span className={styles.sumLabel}>{t.netBalance}</span>
              <span
                className={`${styles.sumValue} ${totals.balance >= 0 ? 'text-positive' : 'text-negative'}`}
              >
                {formatCurrency(totals.balance)}
              </span>
            </div>
          </div>
        )}

        <div className={styles.list}>
          {status === 'loading' && <div className="empty-state">…</div>}
          {status === 'error' && <div className="empty-state">{t.failedLoadTransactions}</div>}
          {status === 'ready' && filtered.length === 0 && (
            <div className="empty-state">
              {transactions.length === 0 ? (
                <>
                  {t.noTransactions}
                  <br />
                  {t.addFirstTransaction}
                </>
              ) : (
                t.noMatches
              )}
            </div>
          )}
          {filtered.map((tx) => (
            <TransactionRow
              key={tx.id}
              tx={tx}
              onEdit={() => {
                setFormTx(tx);
                setFormOpen(true);
              }}
              onDelete={() => setPendingDelete(tx)}
            />
          ))}
        </div>

        <TransactionFormModal
          open={formOpen}
          bookId={bookId}
          transaction={formTx}
          categories={categories}
          onClose={() => setFormOpen(false)}
          onSaved={load}
        />

        <ConfirmDialog
          open={!!pendingDelete}
          title={t.deleteTransaction}
          message={t.deleteTransactionConfirm}
          confirmLabel={t.deleteAction}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
          busy={deleting}
        />
      </div>
    </>
  );
}
