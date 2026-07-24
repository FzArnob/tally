import { useEffect, useRef, useState } from 'react';
import { Modal, ModalHeader } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
import { saveProduct } from '../../lib/api';
import { ApiError, type Product, type ProductType } from '../../types';
import type { Translation } from '../../i18n/translations';
import { ImageCropperModal } from './ImageCropperModal';
import styles from './products.module.css';

const KNOWN_TYPES = ['piece', 'packet', 'cartoon', 'kg', 'liter'] as const;

const UNIT_LABELS: Record<(typeof KNOWN_TYPES)[number], keyof Translation> = {
  piece: 'unitPiece',
  packet: 'unitPacket',
  cartoon: 'unitCartoon',
  kg: 'unitKg',
  liter: 'unitLiter',
};

interface ProductFormModalProps {
  open: boolean;
  product: Product | null;
  bookId: number;
  onClose: () => void;
  onSaved: () => void;
}

export function ProductFormModal({
  open,
  product,
  bookId,
  onClose,
  onSaved,
}: ProductFormModalProps) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('piece');
  const [customType, setCustomType] = useState('');
  const [productType, setProductType] = useState<ProductType>('ready_made');
  const [costItems, setCostItems] = useState<string[]>([]);
  const [costDraft, setCostDraft] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isEdit = !!product;

  // Sync form when opening.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setCostDraft('');
    if (product) {
      setName(product.name);
      const qt = product.quantity_type || 'piece';
      if ((KNOWN_TYPES as readonly string[]).includes(qt)) {
        setType(qt);
        setCustomType('');
      } else {
        setType('custom');
        setCustomType(qt);
      }
      setImage(product.image_url && product.image_url !== 'null' ? product.image_url : null);
      setProductType(product.product_type || 'ready_made');
      setCostItems(
        product.product_type === 'manufacture' ? product.cost_items.map((c) => c.name) : [],
      );
    } else {
      setName('');
      setType('piece');
      setCustomType('');
      setImage(null);
      setProductType('ready_made');
      setCostItems([]);
    }
  }, [open, product]);

  // Commit the typed draft as a new tag, ignoring blanks and case-insensitive duplicates.
  const addCostItem = () => {
    const name = costDraft.trim();
    setCostDraft('');
    if (!name) return;
    setCostItems((prev) =>
      prev.some((c) => c.toLowerCase() === name.toLowerCase()) ? prev : [...prev, name],
    );
  };
  const removeCostItem = (i: number) =>
    setCostItems((prev) => prev.filter((_, idx) => idx !== i));

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so picking the same file again still fires onChange.
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    // Open the cropper with the raw picture; it returns the optimized thumbnail.
    reader.onload = (ev) => setCropSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t.enterProductName);
      return;
    }
    let quantityType = type;
    if (type === 'custom') {
      quantityType = customType.trim();
      if (!quantityType) {
        setError(t.enterQuantityType);
        return;
      }
    }
    let cleanCostItems: string[] = [];
    if (productType === 'manufacture') {
      // Include an unadded draft so a typed-but-not-clicked value isn't lost.
      const pending = costDraft.trim();
      const merged =
        pending && !costItems.some((c) => c.toLowerCase() === pending.toLowerCase())
          ? [...costItems, pending]
          : costItems;
      cleanCostItems = merged.map((c) => c.trim()).filter(Boolean);
      if (cleanCostItems.length === 0) {
        setError(t.enterCostItem);
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      await saveProduct({
        productId: product?.id ?? null,
        name: trimmed,
        quantityType,
        productType,
        costItems: cleanCostItems,
        imageUrl: image,
        bookId,
      });
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'duplicate') {
        setError(t.duplicateProduct);
      } else if (err instanceof ApiError && err.code === 'validation') {
        setError(err.message);
      } else {
        console.error('Failed to save product:', err);
        setError(t.failedSaveProduct);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="productFormTitle"
      header={
        <ModalHeader
          title={isEdit ? t.editProduct : t.addProduct}
          titleId="productFormTitle"
          onClose={onClose}
          closeLabel={t.close}
        />
      }
    >
      <div className={styles.body}>
        <div className="field">
          <label>{t.productImage}</label>
          <button
            type="button"
            className={styles.imageUpload}
            onClick={() => fileRef.current?.click()}
          >
            {image ? (
              <img className={styles.imagePreview} src={image} alt="" />
            ) : (
              <span className="material-symbols-outlined icon-xl">add_photo_alternate</span>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={onFile}
          />
        </div>

        <div className="field">
          <label htmlFor="pName">{t.productName}</label>
          <input
            id="pName"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.productNamePlaceholder}
          />
        </div>

        <div className="field">
          <label>{t.productType}</label>
          <div className={styles.segmented} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={productType === 'ready_made'}
              className={`${styles.segBtn} ${productType === 'ready_made' ? styles.segActive : ''}`}
              onClick={() => setProductType('ready_made')}
            >
              <span className="material-symbols-outlined icon-md">local_shipping</span>
              {t.typeReadyMade}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={productType === 'manufacture'}
              className={`${styles.segBtn} ${productType === 'manufacture' ? styles.segActive : ''}`}
              onClick={() => setProductType('manufacture')}
            >
              <span className="material-symbols-outlined icon-md">precision_manufacturing</span>
              {t.typeManufacture}
            </button>
          </div>
          <span className={styles.fieldHint}>
            {productType === 'manufacture' ? t.typeManufactureHint : t.typeReadyMadeHint}
          </span>
        </div>

        <div className="field">
          <label htmlFor="pType">{t.quantityType}</label>
          <select
            id="pType"
            className="select"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {KNOWN_TYPES.map((k) => (
              <option key={k} value={k}>
                {t[UNIT_LABELS[k]]}
              </option>
            ))}
            <option value="custom">{t.unitCustom}</option>
          </select>
          {type === 'custom' && (
            <input
              className="input"
              style={{ marginTop: '0.5rem' }}
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              placeholder={t.customUnitPlaceholder}
              autoFocus
            />
          )}
        </div>

        {productType === 'manufacture' && (
          <div className="field">
            <label>{t.rawMaterials}</label>
            <div className={styles.costEditor}>
              <div className={styles.costEditRow}>
                <input
                  className="input"
                  value={costDraft}
                  onChange={(e) => setCostDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCostItem();
                    }
                  }}
                  placeholder={t.costItemPlaceholder}
                />
                <button
                  type="button"
                  className={styles.addCostBtn}
                  onClick={addCostItem}
                  disabled={!costDraft.trim()}
                >
                  <span className="material-symbols-outlined icon-md">add</span>
                  {t.add}
                </button>
              </div>
              {costItems.length > 0 && (
                <div className={styles.costTags}>
                  {costItems.map((item, i) => (
                    <span key={i} className={styles.costTag}>
                      {item}
                      <button
                        type="button"
                        className={styles.costTagRemove}
                        aria-label={t.removeLine}
                        onClick={() => removeCostItem(i)}
                      >
                        <span className="material-symbols-outlined icon-sm">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {error && <div className={styles.formError}>{error}</div>}

        <button className="btn btn-primary btn-block" onClick={submit} disabled={saving}>
          {isEdit ? t.saveChanges : t.addProduct}
        </button>
      </div>

      <ImageCropperModal
        open={cropSrc !== null}
        src={cropSrc}
        onCancel={() => setCropSrc(null)}
        onConfirm={(dataUrl) => {
          setImage(dataUrl);
          setCropSrc(null);
        }}
      />
    </Modal>
  );
}
