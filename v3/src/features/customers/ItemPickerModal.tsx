import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
import { getMaterials, getProducts } from '../../lib/api';
import type { CustomerItemDraft, CustomerItemType, Material, Product } from '../../types';
import styles from './customers.module.css';

interface ItemPickerModalProps {
  open: boolean;
  bookId: number;
  /** Hands the finished basket to the parent, which owns the customer. */
  onConfirm: (drafts: CustomerItemDraft[]) => Promise<void>;
  onClose: () => void;
}

/** One sellable thing, flattened so products and materials render identically. */
interface Sellable {
  key: string;
  type: CustomerItemType;
  id: number;
  name: string;
  unit: string;
  /** null = unlimited (manufacture products, whose stock is unknown). */
  stock: number | null;
  price: number;
}

interface DraftLine {
  quantity: number;
  price: string; // kept as a string so the field can be cleared while typing
}

const toSellable = (type: CustomerItemType, id: number, name: string, unit: string, stock: number | null, price: number): Sellable => ({
  key: `${type}:${id}`,
  type,
  id,
  name,
  unit: unit || 'piece',
  stock,
  price,
});

/**
 * Tabbed product/material picker. Tapping a row drops one unit into the basket at
 * its last sale price; the row then grows a stepper and an editable price, so the
 * common case (one of something, at the usual price) stays a single tap.
 */
export function ItemPickerModal({ open, bookId, onConfirm, onClose }: ItemPickerModalProps) {
  const { t, formatCurrency, formatNumber, localizeDigits } = useI18n();
  const [tab, setTab] = useState<CustomerItemType>('product');
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [draft, setDraft] = useState<Record<string, DraftLine>>({});
  const [saving, setSaving] = useState(false);

  // Reload the catalogue and clear the basket each time the sheet opens.
  useEffect(() => {
    if (!open) return;
    let active = true;
    setTab('product');
    setQuery('');
    setDraft({});
    setStatus('loading');
    Promise.all([getProducts(bookId), getMaterials(bookId)])
      .then(([p, m]) => {
        if (!active) return;
        setProducts(p.products || []);
        setMaterials(m.materials || []);
        setStatus('ready');
      })
      .catch((err) => {
        console.error('Failed to load items:', err);
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [open, bookId]);

  const sellables = useMemo<Sellable[]>(() => {
    const list =
      tab === 'product'
        ? products.map((p) =>
            toSellable(
              'product',
              p.id,
              p.name,
              p.quantity_type,
              p.current_stock, // null for manufacture products
              p.last_sale_price ?? p.last_purchase_price ?? 0,
            ),
          )
        : materials.map((m) =>
            toSellable(
              'material',
              m.id,
              m.name,
              m.quantity_type,
              m.current_stock,
              m.last_sale_price ?? m.last_purchase_price ?? 0,
            ),
          );
    const q = query.trim().toLowerCase();
    return q ? list.filter((s) => s.name.toLowerCase().includes(q)) : list;
  }, [tab, products, materials, query]);

  /**
   * Move a line by `delta` units. Works off the previous state rather than the
   * rendered quantity, so tapping + twice in one frame still lands on 2. The
   * line drops out of the basket at zero, and never exceeds the stock in hand.
   */
  const bump = useCallback((s: Sellable, delta: number) => {
    setDraft((prev) => {
      const next = { ...prev };
      let quantity = (prev[s.key]?.quantity ?? 0) + delta;
      if (s.stock !== null) quantity = Math.min(quantity, s.stock);
      if (quantity <= 0) {
        delete next[s.key];
        return next;
      }
      next[s.key] = { quantity, price: prev[s.key]?.price ?? String(s.price) };
      return next;
    });
  }, []);

  const setPrice = useCallback((key: string, price: string) => {
    setDraft((prev) => (prev[key] ? { ...prev, [key]: { ...prev[key], price } } : prev));
  }, []);

  const lines = Object.entries(draft);
  const basketTotal = lines.reduce(
    (sum, [, line]) => sum + line.quantity * (parseFloat(line.price) || 0),
    0,
  );

  const confirm = async () => {
    if (lines.length === 0 || saving) return;
    setSaving(true);
    try {
      await onConfirm(
        lines.map(([key, line]) => {
          const [type, id] = key.split(':');
          return {
            item_type: type as CustomerItemType,
            item_id: Number(id),
            quantity: line.quantity,
            price_per_unit: parseFloat(line.price) || 0,
          };
        }),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="itemPickerTitle"
      header={
        <div className={styles.pickerHead}>
          <div className={styles.pickerHeadRow}>
            <h3 id="itemPickerTitle" className={styles.pickerTitle}>
              {t.addItems}
            </h3>
            <button className="icon-btn" onClick={onClose} aria-label={t.close}>
              <span className="material-symbols-outlined icon-lg">close</span>
            </button>
          </div>

          <div className={styles.pickerTabs} role="tablist">
            <button
              role="tab"
              aria-selected={tab === 'product'}
              className={`${styles.pickerTab} ${tab === 'product' ? styles.pickerTabActive : ''}`}
              onClick={() => setTab('product')}
            >
              {t.productsTitle}
            </button>
            <button
              role="tab"
              aria-selected={tab === 'material'}
              className={`${styles.pickerTab} ${tab === 'material' ? styles.pickerTabActive : ''}`}
              onClick={() => setTab('material')}
            >
              {t.materialsTitle}
            </button>
          </div>

          <div className={styles.pickerSearch}>
            <span className="material-symbols-outlined icon-md">search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchItems}
              aria-label={t.searchItems}
            />
          </div>
        </div>
      }
      footer={
        <button
          className="btn btn-primary btn-block btn-margin"
          onClick={confirm}
          disabled={lines.length === 0 || saving}
        >
          {lines.length === 0
            ? t.addItems
            : `${t.addItems} · ${localizeDigits(String(lines.length))} · ${formatCurrency(basketTotal)}`}
        </button>
      }
    >
      <div className={styles.pickerList}>
        {status === 'loading' && <div className="empty-state">…</div>}
        {status === 'error' && <div className="empty-state">{t.failedLoadItems}</div>}
        {status === 'ready' && sellables.length === 0 && (
          <div className="empty-state">{t.noMatches}</div>
        )}

        {sellables.map((s) => {
          const line = draft[s.key];
          const qty = line?.quantity ?? 0;
          // Manufacture products carry a null stock, so they are never capped.
          const soldOut = s.stock !== null && s.stock <= 0;
          const atStockCap = s.stock !== null && qty >= s.stock;

          return (
            <div
              key={s.key}
              className={`${styles.pickRow} ${line ? styles.pickRowActive : ''} ${
                soldOut ? styles.pickRowOut : ''
              }`}
            >
              <button className={styles.pickMain} disabled={soldOut} onClick={() => bump(s, 1)}>
                <span className={styles.pickName} title={s.name}>
                  {s.name}
                </span>
                <span className={styles.pickMeta}>
                  {soldOut
                    ? t.outOfStock
                    : s.stock === null
                      ? formatCurrency(s.price)
                      : `${formatCurrency(s.price)} · ${t.stock} ${localizeDigits(
                          `${formatNumber(s.stock)} ${s.unit}`,
                        )}`}
                </span>
              </button>

              {line ? (
                <div className={styles.pickControls}>
                  <div className={styles.stepper}>
                    <button
                      className={styles.stepBtn}
                      aria-label={t.removeOne}
                      onClick={() => bump(s, -1)}
                    >
                      <span className="material-symbols-outlined icon-sm">remove</span>
                    </button>
                    <span className={styles.stepValue}>{localizeDigits(formatNumber(qty))}</span>
                    <button
                      className={styles.stepBtn}
                      aria-label={t.addOne}
                      disabled={atStockCap}
                      onClick={() => bump(s, 1)}
                    >
                      <span className="material-symbols-outlined icon-sm">add</span>
                    </button>
                  </div>
                  <div className={styles.pickPrice}>
                    <span>৳</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      value={line.price}
                      onChange={(e) => setPrice(s.key, e.target.value)}
                      aria-label={t.pricePerUnit}
                    />
                  </div>
                </div>
              ) : (
                <span className={styles.pickAdd} aria-hidden="true">
                  <span className="material-symbols-outlined icon-md">add</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
