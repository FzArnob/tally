import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/LanguageContext';
import { Header, HeaderBackButton } from '../../components/Header';
import { UserMenu } from '../../auth/UserMenu';
import { Toolbar } from '../../components/Toolbar';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import {
  deleteMaterial,
  deleteMaterialTransaction,
  getMaterials,
  getMaterialTransactions,
} from '../../lib/api';
import type { Book, Material, MaterialTransaction } from '../../types';
import { MaterialCard } from './MaterialCard';
import { MaterialFormModal } from './MaterialFormModal';
import { MaterialActionModal } from './MaterialActionModal';
import { MaterialHistoryModal } from './MaterialHistoryModal';
import styles from './materials.module.css';

export function MaterialsPage({ book }: { book: Book }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const bookId = book.id;

  const [materials, setMaterials] = useState<Material[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [query, setQuery] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [formMaterial, setFormMaterial] = useState<Material | null>(null);

  const [actionOpen, setActionOpen] = useState(false);
  const [actionMaterial, setActionMaterial] = useState<Material | null>(null);
  const [actionEditTx, setActionEditTx] = useState<MaterialTransaction | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyMaterial, setHistoryMaterial] = useState<Material | null>(null);
  const [historyTx, setHistoryTx] = useState<MaterialTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [pendingDeleteTx, setPendingDeleteTx] = useState<MaterialTransaction | null>(null);
  const [pendingDeleteMaterial, setPendingDeleteMaterial] = useState<Material | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getMaterials(bookId);
      setMaterials(data.materials || []);
      setStatus('ready');
    } catch (err) {
      console.error('Failed to load materials:', err);
      setStatus('error');
    }
  }, [bookId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return materials;
    return materials.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.quantity_type || '').toLowerCase().includes(q),
    );
  }, [materials, query]);

  const loadHistory = useCallback(async (materialId: number) => {
    setHistoryLoading(true);
    try {
      const data = await getMaterialTransactions(materialId);
      setHistoryTx(data.transactions);
    } catch (err) {
      console.error('Failed to load material history:', err);
      setHistoryTx([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const openAction = (material: Material) => {
    setActionMaterial(material);
    setActionEditTx(null);
    setActionOpen(true);
  };

  const openHistory = (material: Material) => {
    setHistoryMaterial(material);
    setHistoryOpen(true);
    void loadHistory(material.id);
  };

  const openAdd = () => {
    setFormMaterial(null);
    setFormOpen(true);
  };

  const afterTxChange = async () => {
    await load();
    if (historyMaterial) await loadHistory(historyMaterial.id);
  };

  const editFromHistory = (tx: MaterialTransaction) => {
    setHistoryOpen(false);
    setActionMaterial(historyMaterial);
    setActionEditTx(tx);
    setActionOpen(true);
  };

  const confirmDeleteTx = async () => {
    if (!pendingDeleteTx) return;
    setDeleting(true);
    try {
      await deleteMaterialTransaction(pendingDeleteTx.id);
      setPendingDeleteTx(null);
      await afterTxChange();
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      alert(t.failedDeleteTransaction);
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteMaterial = async () => {
    if (!pendingDeleteMaterial) return;
    setDeleting(true);
    try {
      await deleteMaterial(pendingDeleteMaterial.id);
      setPendingDeleteMaterial(null);
      await load();
    } catch (err) {
      console.error('Failed to delete material:', err);
      alert(t.failedDeleteMaterial);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Header
        leading={<HeaderBackButton label={t.back} onClick={() => navigate(`/${bookId}/products`)} />}
        title={t.materialsTitle}
        actions={<UserMenu />}
      />

      <main className={styles.main}>
        <Toolbar
          query={query}
          onQueryChange={setQuery}
          searchPlaceholder={t.searchMaterials}
          addLabel={t.add}
          onAdd={openAdd}
        />

        <div className={styles.list}>
          {status === 'loading' && <div className="empty-state">…</div>}
          {status === 'error' && <div className="empty-state">{t.failedLoadMaterials}</div>}
          {status === 'ready' && filtered.length === 0 && (
            <div className="empty-state">
              {materials.length === 0 ? (
                <>
                  {t.noMaterials}
                  <br />
                  {t.addFirstMaterial}
                </>
              ) : (
                t.noMatches
              )}
            </div>
          )}
          {filtered.map((material, i) => (
            <MaterialCard
              key={material.id}
              material={material}
              index={i}
              onOpen={() => openAction(material)}
              onHistory={() => openHistory(material)}
              onEdit={() => {
                setFormMaterial(material);
                setFormOpen(true);
              }}
              onDelete={() => setPendingDeleteMaterial(material)}
            />
          ))}
        </div>
      </main>

      <MaterialFormModal
        open={formOpen}
        material={formMaterial}
        bookId={bookId}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />

      <MaterialActionModal
        open={actionOpen}
        material={actionMaterial}
        editTx={actionEditTx}
        onClose={() => setActionOpen(false)}
        onSaved={afterTxChange}
      />

      <MaterialHistoryModal
        open={historyOpen}
        material={historyMaterial}
        transactions={historyTx}
        loading={historyLoading}
        onClose={() => setHistoryOpen(false)}
        onEdit={editFromHistory}
        onDelete={(tx) => setPendingDeleteTx(tx)}
      />

      <ConfirmDialog
        open={!!pendingDeleteTx}
        title={t.deleteEntry}
        message={t.deleteEntryConfirm}
        confirmLabel={t.deleteAction}
        onConfirm={confirmDeleteTx}
        onCancel={() => setPendingDeleteTx(null)}
        busy={deleting}
      />

      <ConfirmDialog
        open={!!pendingDeleteMaterial}
        title={t.deleteMaterial}
        message={t.deleteMaterialConfirm}
        confirmLabel={t.deleteAction}
        onConfirm={confirmDeleteMaterial}
        onCancel={() => setPendingDeleteMaterial(null)}
        busy={deleting}
      />
    </>
  );
}
