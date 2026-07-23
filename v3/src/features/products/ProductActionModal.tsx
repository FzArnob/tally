import { useEffect, useState } from 'react';
import { Modal } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
import { saveProductTransaction } from '../../lib/api';
import { ApiError, type Product, type ProductTransaction, type TransactionType } from '../../types';
import styles from './products.module.css';

interface ProductActionModalProps {
  open: boolean;
  product: Product | null;
  editTx: ProductTransaction | null;
  onClose: () => void;
  onSaved: () => void;
}

interface CostLine {
  name: string;
  amount: string;
}

export function ProductActionModal({
  open,
  product,
  editTx,
  onClose,
  onSaved,
}: ProductActionModalProps) {
  const { t, formatCurrency, formatNumber } = useI18n();
  const [tab, setTab] = useState<TransactionType>('stock');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [costLines, setCostLines] = useState<CostLine[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !product) return;
    // Cost lines come from the transaction being edited (its own snapshot), or
    // from the product's current template for a fresh stock-in.
    const templateLines: CostLine[] =
      product.cost_items.length > 0
        ? product.cost_items.map((c) => ({ name: c.name, amount: '' }))
        : [{ name: '', amount: '' }];
    if (editTx) {
      setTab(editTx.type);
      setQty(String(editTx.quantity));
      setPrice(String(editTx.price_per_unit));
      setCostLines(
        editTx.costs.length > 0
          ? editTx.costs.map((c) => ({ name: c.name, amount: String(c.amount) }))
          : templateLines,
      );
    } else {
      setTab('stock');
      setQty('');
      setPrice('');
      setCostLines(templateLines);
    }
  }, [open, editTx, product]);

  if (!product) return null;

  const isStock = tab === 'stock';
  const isManufacture = product.product_type === 'manufacture';
  // A manufacture stock-in is costed from its line breakdown; everything else
  // (ready-made stock, any sale) uses the single price field.
  const showCostBreakdown = isStock && isManufacture;
  const costTotal = costLines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
  const qtyNum = parseFloat(qty) || 0;
  const perUnit = qtyNum > 0 ? costTotal / qtyNum : 0;
  const total = showCostBreakdown ? costTotal : qtyNum * (parseFloat(price) || 0);
  const hasImage = product.image_url && product.image_url !== 'null';

  const setCostAmount = (i: number, value: string) =>
    setCostLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, amount: value } : l)));

  // Stock available for a sale. When editing, reverse the edited entry's effect
  // so lowering/raising it validates against the true baseline (mirrors the API).
  const unit = product.quantity_type || 'piece';
  const available =
    (product.current_stock || 0) +
    (editTx ? (editTx.type === 'sale' ? editTx.quantity : -editTx.quantity) : 0);

  const submit = async () => {
    const q = parseFloat(qty);
    if (!q || q <= 0) {
      alert(t.enterValidQuantity);
      return;
    }

    // Manufacture stock-in: build the cost breakdown; price is derived server-side.
    let costs: { name: string; amount: number }[] = [];
    let p = parseFloat(price);
    if (showCostBreakdown) {
      costs = costLines
        .filter((l) => l.amount.trim() !== '' && !isNaN(parseFloat(l.amount)))
        .map((l) => ({ name: l.name.trim(), amount: parseFloat(l.amount) }));
      if (costTotal <= 0) {
        alert(t.enterCostAmount);
        return;
      }
      p = perUnit;
    } else if (isNaN(p) || p < 0) {
      alert(t.enterValidPrice);
      return;
    }
    // A sale cannot exceed the stock in hand (stock never goes below 0).
    if (tab === 'sale' && q - available > 1e-9) {
      alert(`${t.notEnoughStock} ${formatNumber(available)} ${unit}`);
      return;
    }
    setSaving(true);
    try {
      // Editing passes `replaces` so the API swaps the entry atomically.
      await saveProductTransaction({
        productId: product.id,
        type: tab,
        quantity: q,
        pricePerUnit: p,
        costs,
        replaces: editTx?.id ?? null,
      });
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'insufficient_stock') {
        alert(err.message);
      } else {
        console.error('Failed to save transaction:', err);
        alert(t.failedSaveTransaction);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="actionTitle"
      header={
        <div className={styles.actionHeader}>
          <div className={styles.headerInfo}>
            {hasImage && <img className={styles.actionThumb} src={product.image_url as string} alt="" />}
            <div style={{ minWidth: 0 }}>
              <div className={styles.actionTitleRow}>
                <h3
                  id="actionTitle"
                  className={styles.actionName}
                  title={product.name}
                  style={{ fontSize: 'var(--fs-heading-sm)', fontWeight: 600 }}
                >
                  {product.name}
                </h3>
              </div>
              <span className={styles.actionStock}>
                {t.stock}: {formatNumber(product.current_stock || 0)} {product.quantity_type || 'piece'}
                {product.last_purchase_price != null && (
                  <> · {t.lastPurchase} {formatCurrency(product.last_purchase_price)}</>
                )}
                {product.last_sale_price != null && (
                  <> · {t.lastSale} {formatCurrency(product.last_sale_price)}</>
                )}
              </span>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label={t.close}>
            <span className="material-symbols-outlined icon-lg">close</span>
          </button>
        </div>
      }
    >
      <div className={styles.body} style={{ gap: '1rem' }}>
        {!editTx && (
          <div className={styles.tabSwitch}>
            <button
              className={`${styles.tabBtn} ${isStock ? styles.activeStock : ''}`}
              onClick={() => setTab('stock')}
            >
              {t.stockIn}
            </button>
            <button
              className={`${styles.tabBtn} ${!isStock ? styles.activeSale : ''}`}
              onClick={() => setTab('sale')}
            >
              {t.sale}
            </button>
          </div>
        )}

        <div className="field">
          <label htmlFor="qty">{showCostBreakdown ? t.quantityProduced : t.quantity}</label>
          <input
            id="qty"
            className="input"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="0"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </div>

        {showCostBreakdown ? (
          <div className="field">
            <label>{t.rawMaterials}</label>
            <div className={styles.costList}>
              {costLines.map((line, i) => (
                <div key={i} className={styles.costLineRow}>
                  <span className={styles.costLineName} title={line.name || t.cost}>
                    {line.name || t.cost}
                  </span>
                  <input
                    className={`input ${styles.costLineInput}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={line.amount}
                    onChange={(e) => setCostAmount(i, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div className={styles.perUnitRow}>
              <span>{t.costPerUnit}</span>
              <span>
                {formatCurrency(perUnit)} / {unit}
              </span>
            </div>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="price">{isStock ? t.buyingPrice : t.sellingPrice}</label>
            <input
              id="price"
              className="input"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        )}

        <div className={styles.totalRow}>
          <span>{showCostBreakdown ? t.totalCost : t.total}</span>
          <span className={styles.totalValue}>{formatCurrency(total)}</span>
        </div>

        <button
          className={`btn btn-block ${isStock ? styles.saveStock : styles.saveSale}`}
          onClick={submit}
          disabled={saving}
        >
          {editTx ? t.update : t.save}
        </button>
      </div>
    </Modal>
  );
}
