import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '../../i18n/LanguageContext';
import { deleteProductTransaction, getProductsWithStock } from '../../lib/api';
import type { Product, ProductTransaction } from '../../types';
import { ProductCard } from './ProductCard';
import { ProductFormModal } from './ProductFormModal';
import { ProductActionModal } from './ProductActionModal';
import { ProductHistoryModal } from './ProductHistoryModal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import styles from './products.module.css';

/** PDO returns transaction fields as strings; coerce to the numeric shape. */
function normalize(products: Product[]): Product[] {
  return products.map((p) => ({
    ...p,
    transactions: (p.transactions ?? []).map((tx) => ({
      id: Number(tx.id),
      type: tx.type,
      quantity: Number(tx.quantity),
      price_per_unit: Number(tx.price_per_unit),
      total_amount: Number(tx.total_amount),
      created_at: tx.created_at,
    })),
  }));
}

export function ProductsSection() {
  const { t } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const [formOpen, setFormOpen] = useState(false);
  const [formProduct, setFormProduct] = useState<Product | null>(null);

  const [actionOpen, setActionOpen] = useState(false);
  const [actionProductId, setActionProductId] = useState<number | null>(null);
  const [actionEditTx, setActionEditTx] = useState<ProductTransaction | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyProductId, setHistoryProductId] = useState<number | null>(null);

  const [pendingDelete, setPendingDelete] = useState<{ tx: ProductTransaction; productId: number } | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getProductsWithStock();
      setProducts(normalize(data.products || []));
      setStatus('ready');
    } catch (err) {
      console.error('Failed to load products:', err);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const actionProduct = actionProductId != null ? products.find((p) => p.id === actionProductId) ?? null : null;
  const historyProduct =
    historyProductId != null ? products.find((p) => p.id === historyProductId) ?? null : null;

  const openAction = (product: Product) => {
    setActionProductId(product.id);
    setActionEditTx(null);
    setActionOpen(true);
  };

  const openHistory = (product: Product) => {
    setHistoryProductId(product.id);
    setHistoryOpen(true);
  };

  const openAdd = () => {
    setFormProduct(null);
    setFormOpen(true);
  };

  const editFromHistory = (tx: ProductTransaction) => {
    setHistoryOpen(false);
    setActionProductId(historyProductId);
    setActionEditTx(tx);
    setActionOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteProductTransaction({
        transactionId: pendingDelete.tx.id,
        productId: pendingDelete.productId,
      });
      await load();
      setPendingDelete(null);
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      alert(t.failedDeleteTransaction);
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
          />
        ))}
        {status !== 'loading' && (
          <button className={`${styles.card} ${styles.add}`} aria-label={t.addProduct} onClick={openAdd}>
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
        onSaved={load}
        onEditProduct={(product) => {
          setActionOpen(false);
          setFormProduct(product);
          setFormOpen(true);
        }}
      />

      <ProductHistoryModal
        open={historyOpen}
        product={historyProduct}
        onClose={() => setHistoryOpen(false)}
        onEdit={editFromHistory}
        onDelete={(tx) => setPendingDelete({ tx, productId: historyProductId as number })}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title={t.deleteEntry}
        message={t.deleteEntryConfirm}
        confirmLabel={t.deleteAction}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
        busy={deleting}
      />
    </main>
  );
}
