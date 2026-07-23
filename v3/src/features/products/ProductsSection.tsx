import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/LanguageContext';
import {
  deleteProduct,
  deleteProductTransaction,
  getProducts,
  getProductTransactions,
} from '../../lib/api';
import type { Product, ProductTransaction } from '../../types';
import { ProductCard } from './ProductCard';
import { ProductFormModal } from './ProductFormModal';
import { ProductActionModal } from './ProductActionModal';
import { ProductHistoryModal } from './ProductHistoryModal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import styles from './products.module.css';

export function ProductsSection() {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const [formOpen, setFormOpen] = useState(false);
  const [formProduct, setFormProduct] = useState<Product | null>(null);

  const [actionOpen, setActionOpen] = useState(false);
  const [actionProduct, setActionProduct] = useState<Product | null>(null);
  const [actionEditTx, setActionEditTx] = useState<ProductTransaction | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [historyTx, setHistoryTx] = useState<ProductTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [pendingDeleteTx, setPendingDeleteTx] = useState<ProductTransaction | null>(null);
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getProducts();
      setProducts(data.products || []);
      setStatus('ready');
    } catch (err) {
      console.error('Failed to load products:', err);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadHistory = useCallback(async (productId: number) => {
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
      console.error('Failed to delete transaction:', err);
      alert(t.failedDeleteTransaction);
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
      <div className={styles.grid}>
        {status === 'error' && (
          <div className={`${styles.emptyWrap} empty-state`}>{t.failedLoadProducts}</div>
        )}
        {status === 'ready' && products.length === 0 && (
          <div className={`${styles.emptyWrap} empty-state`}>
            {t.noProducts}
            <br />
            {t.addFirstProduct}
          </div>
        )}
        {products.map((product, i) => (
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
          />
        ))}
        {status !== 'loading' && (
          <button className={styles.add} aria-label={t.addProduct} onClick={openAdd}>
            <span className="material-symbols-outlined icon-xl">add</span>
          </button>
        )}
      </div>

      <ProductFormModal
        open={formOpen}
        product={formProduct}
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
