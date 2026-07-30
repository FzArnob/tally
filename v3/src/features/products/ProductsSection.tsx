import { useCallback, useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/LanguageContext';
import {
  deleteProduct,
  deleteProductTransaction,
  getProducts,
  getProductTransactions,
} from '../../lib/api';
import { ApiError, type Product, type ProductTransaction } from '../../types';
import { ProductCard } from './ProductCard';
import { ProductFormModal } from './ProductFormModal';
import { ProductActionModal } from './ProductActionModal';
import { ProductHistoryModal } from './ProductHistoryModal';
import { ProductMaterialsModal } from './ProductMaterialsModal';
import { useCustomerTabModal } from '../customers/useCustomerTabModal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Toolbar } from '../../components/Toolbar';
import styles from './products.module.css';

export function ProductsSection({ bookId }: { bookId: string }) {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [query, setQuery] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [formProduct, setFormProduct] = useState<Product | null>(null);

  const [actionOpen, setActionOpen] = useState(false);
  const [actionProduct, setActionProduct] = useState<Product | null>(null);
  const [actionEditTx, setActionEditTx] = useState<ProductTransaction | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [historyTx, setHistoryTx] = useState<ProductTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [materialsProduct, setMaterialsProduct] = useState<Product | null>(null);

  const [pendingDeleteTx, setPendingDeleteTx] = useState<ProductTransaction | null>(null);
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getProducts(bookId);
      setProducts(data.products || []);
      setStatus('ready');
    } catch (err) {
      console.error('Failed to load products:', err);
      setStatus('error');
    }
  }, [bookId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.quantity_type || '').toLowerCase().includes(q),
    );
  }, [products, query]);

  const loadHistory = useCallback(async (productId: string) => {
    setHistoryLoading(true);
    try {
      const data = await getProductTransactions(productId);
      setHistoryTx(data.transactions);
    } catch (err) {
      console.error('Failed to load product history:', err);
      setHistoryTx([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const openAction = (product: Product) => {
    setActionProduct(product);
    setActionEditTx(null);
    setActionOpen(true);
  };

  const openHistory = (product: Product) => {
    setHistoryProduct(product);
    setHistoryOpen(true);
    void loadHistory(product.id);
  };

  const openAdd = () => {
    setFormProduct(null);
    setFormOpen(true);
  };

  // After a transaction changes, refresh the grid (stock) and the open history.
  const afterTxChange = async () => {
    await load();
    if (historyProduct) await loadHistory(historyProduct.id);
  };

  // Tapping a customer's name in the history opens their tab. Settling in there
  // clears Unpaid pills, so the history behind it is reloaded on any change.
  const { openCustomerTab, customerTabModal } = useCustomerTabModal(() => {
    void afterTxChange();
  });

  const editFromHistory = (tx: ProductTransaction) => {
    setHistoryOpen(false);
    setActionProduct(historyProduct);
    setActionEditTx(tx);
    setActionOpen(true);
  };

  const confirmDeleteTx = async () => {
    if (!pendingDeleteTx) return;
    setDeleting(true);
    try {
      await deleteProductTransaction(pendingDeleteTx.id);
      setPendingDeleteTx(null);
      await afterTxChange();
    } catch (err) {
      // 'settled' explains why a paid tab sale cannot be deleted here.
      if (err instanceof ApiError && err.code === 'settled') {
        setPendingDeleteTx(null);
        alert(err.message);
      } else {
        console.error('Failed to delete transaction:', err);
        alert(t.failedDeleteTransaction);
      }
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteProduct = async () => {
    if (!pendingDeleteProduct) return;
    setDeleting(true);
    try {
      await deleteProduct(pendingDeleteProduct.id);
      setPendingDeleteProduct(null);
      await load();
    } catch (err) {
      console.error('Failed to delete product:', err);
      alert(t.failedDeleteProduct);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className={styles.main}>
      <Toolbar
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder={t.searchProducts}
        addLabel={t.add}
        onAdd={openAdd}
      />

      <div className={styles.list}>
        {status === 'loading' && <div className={`empty-state ${styles.listMessage}`}>…</div>}
        {status === 'error' && (
          <div className={`empty-state ${styles.listMessage}`}>{t.failedLoadProducts}</div>
        )}
        {status === 'ready' && filtered.length === 0 && (
          <div className={`empty-state ${styles.listMessage}`}>
            {products.length === 0 ? (
              <>
                {t.noProducts}
                <br />
                {t.addFirstProduct}
              </>
            ) : (
              t.noMatches
            )}
          </div>
        )}
        {filtered.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            index={i}
            onOpen={() => openAction(product)}
            onHistory={() => openHistory(product)}
            onEdit={() => {
              setFormProduct(product);
              setFormOpen(true);
            }}
            onDelete={() => setPendingDeleteProduct(product)}
            onMaterials={() => setMaterialsProduct(product)}
          />
        ))}
      </div>

      <ProductFormModal
        open={formOpen}
        product={formProduct}
        bookId={bookId}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />

      <ProductActionModal
        open={actionOpen}
        product={actionProduct}
        editTx={actionEditTx}
        onClose={() => setActionOpen(false)}
        onSaved={afterTxChange}
      />

      <ProductHistoryModal
        open={historyOpen}
        product={historyProduct}
        transactions={historyTx}
        loading={historyLoading}
        onClose={() => setHistoryOpen(false)}
        onEdit={editFromHistory}
        onDelete={(tx) => setPendingDeleteTx(tx)}
        onCustomer={(id) => void openCustomerTab(id)}
      />

      {customerTabModal}

      <ProductMaterialsModal
        open={!!materialsProduct}
        product={materialsProduct}
        onClose={() => setMaterialsProduct(null)}
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
        open={!!pendingDeleteProduct}
        title={t.deleteProduct}
        message={t.deleteProductConfirm}
        confirmLabel={t.deleteAction}
        onConfirm={confirmDeleteProduct}
        onCancel={() => setPendingDeleteProduct(null)}
        busy={deleting}
      />
    </main>
  );
}
