import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/LanguageContext';
import { Header, HeaderBackButton } from '../../components/Header';
import { UserMenu } from '../../auth/UserMenu';
import { Toolbar } from '../../components/Toolbar';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import {
  deleteOperationCost,
  deleteOperationCostEntry,
  getOperationCostHistory,
  getOperationCosts,
} from '../../lib/api';
import type { Book, OperationCost, OperationCostEntry } from '../../types';
import { OperationCard } from './OperationCard';
import { OperationFormModal } from './OperationFormModal';
import { OperationActionModal } from './OperationActionModal';
import { OperationHistoryModal } from './OperationHistoryModal';
import styles from './operations.module.css';

export function OperationsPage({ book }: { book: Book }) {
  const { t, formatCurrency } = useI18n();
  const navigate = useNavigate();
  const bookId = book.id;

  const [operations, setOperations] = useState<OperationCost[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [query, setQuery] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [formOperation, setFormOperation] = useState<OperationCost | null>(null);

  const [actionOpen, setActionOpen] = useState(false);
  const [actionOperation, setActionOperation] = useState<OperationCost | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyOperation, setHistoryOperation] = useState<OperationCost | null>(null);
  const [historyEntries, setHistoryEntries] = useState<OperationCostEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<OperationCost | null>(null);
  const [pendingDeleteEntry, setPendingDeleteEntry] = useState<OperationCostEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getOperationCosts(bookId);
      setOperations(data.operation_costs || []);
      setTotal(data.total || 0);
      setStatus('ready');
    } catch (err) {
      console.error('Failed to load operation costs:', err);
      setStatus('error');
    }
  }, [bookId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return operations;
    return operations.filter(
      (o) =>
        o.reason.toLowerCase().includes(q) || (o.note || '').toLowerCase().includes(q),
    );
  }, [operations, query]);

  const loadHistory = useCallback(async (id: number) => {
    setHistoryLoading(true);
    try {
      const data = await getOperationCostHistory(id);
      setHistoryEntries(data.history);
    } catch (err) {
      console.error('Failed to load operation history:', err);
      setHistoryEntries([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const openAction = (operation: OperationCost) => {
    setActionOperation(operation);
    setActionOpen(true);
  };

  const openHistory = (operation: OperationCost) => {
    setHistoryOperation(operation);
    setHistoryOpen(true);
    void loadHistory(operation.id);
  };

  const openAdd = () => {
    setFormOperation(null);
    setFormOpen(true);
  };

  // After amounts change, refresh the list totals and any open history.
  const afterEntryChange = async () => {
    await load();
    if (historyOperation) await loadHistory(historyOperation.id);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteOperationCost(pendingDelete.id);
      setPendingDelete(null);
      await load();
    } catch (err) {
      console.error('Failed to delete operation cost:', err);
      alert(t.failedDeleteOperation);
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteEntry = async () => {
    if (!pendingDeleteEntry) return;
    setDeleting(true);
    try {
      await deleteOperationCostEntry(pendingDeleteEntry.id);
      setPendingDeleteEntry(null);
      await afterEntryChange();
    } catch (err) {
      console.error('Failed to delete entry:', err);
      alert(t.failedDeleteEntry);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Header
        leading={<HeaderBackButton label={t.back} onClick={() => navigate(`/${bookId}/products`)} />}
        title={t.operationsTitle}
        actions={<UserMenu />}
      />

      <main className={styles.main}>
        <Toolbar
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder={t.searchOperations}
          addLabel={t.add}
          onAdd={openAdd}
        >
          {status === 'ready' && operations.length > 0 && (
            <div className={styles.totals}>
              <span className={styles.totalsLabel}>{t.totalOperationCost}</span>
              <span className={styles.totalsValue}>{formatCurrency(total)}</span>
            </div>
          )}
        </Toolbar>

        <div className={styles.list}>
          {status === 'loading' && <div className="empty-state">…</div>}
          {status === 'error' && <div className="empty-state">{t.failedLoadOperations}</div>}
          {status === 'ready' && filtered.length === 0 && (
            <div className="empty-state">
              {operations.length === 0 ? (
                <>
                  {t.noOperations}
                  <br />
                  {t.addFirstOperation}
                </>
              ) : (
                t.noMatches
              )}
            </div>
          )}
          {filtered.map((operation, i) => (
            <OperationCard
              key={operation.id}
              operation={operation}
              index={i}
              onOpen={() => openAction(operation)}
              onHistory={() => openHistory(operation)}
              onEdit={() => {
                setFormOperation(operation);
                setFormOpen(true);
              }}
              onDelete={() => setPendingDelete(operation)}
            />
          ))}
        </div>
      </main>

      <OperationFormModal
        open={formOpen}
        operation={formOperation}
        bookId={bookId}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />

      <OperationActionModal
        open={actionOpen}
        operation={actionOperation}
        onClose={() => setActionOpen(false)}
        onSaved={afterEntryChange}
      />

      <OperationHistoryModal
        open={historyOpen}
        operation={historyOperation}
        entries={historyEntries}
        loading={historyLoading}
        onClose={() => setHistoryOpen(false)}
        onDelete={(entry) => setPendingDeleteEntry(entry)}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title={t.deleteOperation}
        message={t.deleteOperationConfirm}
        confirmLabel={t.deleteAction}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
        busy={deleting}
      />

      <ConfirmDialog
        open={!!pendingDeleteEntry}
        title={t.deleteEntry}
        message={t.deleteEntryConfirm}
        confirmLabel={t.deleteAction}
        onConfirm={confirmDeleteEntry}
        onCancel={() => setPendingDeleteEntry(null)}
        busy={deleting}
      />
    </>
  );
}
