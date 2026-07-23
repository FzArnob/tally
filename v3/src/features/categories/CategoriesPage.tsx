import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/LanguageContext';
import { Header, HeaderBackButton } from '../../components/Header';
import { ThemeToggle } from '../../components/ThemeToggle';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { deleteCategory, getCategories } from '../../lib/api';
import type { Book, CashflowType, Category } from '../../types';
import { CategoryFormModal } from './CategoryFormModal';
import styles from './categories.module.css';

function CategoryCard({
  category,
  onEdit,
  onDelete,
}: {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t, formatNumber, localizeDigits } = useI18n();
  return (
    <div className={styles.card}>
      <div className={styles.cardInfo}>
        <span className={styles.cardName} title={category.name}>
          {category.name}
        </span>
        {category.details && (
          <span className={styles.cardDetails} title={category.details}>
            {category.details}
          </span>
        )}
        <span className={styles.cardCount}>
          {localizeDigits(formatNumber(category.transaction_count))} {t.transactions}
        </span>
      </div>
      <div className={styles.cardActions}>
        <button className="ghost-btn" aria-label={t.editCategory} onClick={onEdit}>
          <span className="material-symbols-outlined icon-md">edit</span>
        </button>
        <button className="ghost-btn" aria-label={t.deleteCategory} onClick={onDelete}>
          <span className="material-symbols-outlined icon-md">delete</span>
        </button>
      </div>
    </div>
  );
}

function Section({
  type,
  items,
  onAdd,
  onEdit,
  onDelete,
}: {
  type: CashflowType;
  items: Category[];
  onAdd: () => void;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
}) {
  const { t } = useI18n();
  const income = type === 'income';
  return (
    <section className={`${styles.section} ${income ? styles.income : styles.expense}`}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>
          <span className="material-symbols-outlined icon-md">
            {income ? 'trending_up' : 'trending_down'}
          </span>
          {income ? t.income : t.expense}
        </span>
        <button className={styles.addBtn} onClick={onAdd}>
          <span className="material-symbols-outlined icon-md">add</span>
          {t.add}
        </button>
      </div>

      {items.length === 0 ? (
        <div className={styles.sectionEmpty}>{t.noCategories}</div>
      ) : (
        <div className={styles.grid}>
          {items.map((c) => (
            <CategoryCard
              key={c.id}
              category={c}
              onEdit={() => onEdit(c)}
              onDelete={() => onDelete(c)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function CategoriesPage({ book }: { book: Book }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const bookId = book.id;

  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const [formOpen, setFormOpen] = useState(false);
  const [formCategory, setFormCategory] = useState<Category | null>(null);
  const [formType, setFormType] = useState<CashflowType>('expense');
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getCategories(bookId);
      setCategories(data.categories);
      setStatus('ready');
    } catch (err) {
      console.error('Failed to load categories:', err);
      setStatus('error');
    }
  }, [bookId]);

  useEffect(() => {
    void load();
  }, [load]);

  const income = useMemo(() => categories.filter((c) => c.type === 'income'), [categories]);
  const expense = useMemo(() => categories.filter((c) => c.type === 'expense'), [categories]);

  const openAdd = (type: CashflowType) => {
    setFormCategory(null);
    setFormType(type);
    setFormOpen(true);
  };

  const openEdit = (c: Category) => {
    setFormCategory(c);
    setFormType(c.type);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteCategory(pendingDelete.id);
      setPendingDelete(null);
      await load();
    } catch (err) {
      console.error('Failed to delete category:', err);
      alert(t.failedDeleteCategory);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Header
        leading={
          <HeaderBackButton label={t.back} onClick={() => navigate(`/${bookId}/transactions`)} />
        }
        title={t.categoriesTitle}
        actions={
          <>
            <ThemeToggle />
            <LanguageSwitcher />
          </>
        }
      />

      <div className={styles.page}>
        {status === 'loading' && <div className="empty-state">…</div>}
        {status === 'error' && <div className="empty-state">{t.failedLoadCategories}</div>}
        {status === 'ready' && (
          <>
            <Section
              type="income"
              items={income}
              onAdd={() => openAdd('income')}
              onEdit={openEdit}
              onDelete={setPendingDelete}
            />
            <Section
              type="expense"
              items={expense}
              onAdd={() => openAdd('expense')}
              onEdit={openEdit}
              onDelete={setPendingDelete}
            />
          </>
        )}
      </div>

      <CategoryFormModal
        open={formOpen}
        bookId={bookId}
        category={formCategory}
        type={formType}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title={t.deleteCategory}
        message={t.deleteCategoryConfirm}
        confirmLabel={t.deleteAction}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
        busy={deleting}
      />
    </>
  );
}
