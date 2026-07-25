import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, ModalHeader } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useI18n } from '../../i18n/LanguageContext';
import { getMaterials, saveProduct } from '../../lib/api';
import { ApiError, type Material, type Product, type ProductType } from '../../types';
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
  const { t, formatNumber } = useI18n();
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('piece');
  const [customType, setCustomType] = useState('');
  const [productType, setProductType] = useState<ProductType>('ready_made');

  // Manufacture material picker.
  const [allMaterials, setAllMaterials] = useState<Material[]>([]);
  const [materialsLoaded, setMaterialsLoaded] = useState(false);
  const [linkedIds, setLinkedIds] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [pendingUnlink, setPendingUnlink] = useState<Material | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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
    setSearch('');
    setSelectedId(null);
    setPendingUnlink(null);
    setAllMaterials([]);
    setMaterialsLoaded(false);
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
      setLinkedIds(
        product.product_type === 'manufacture' ? product.materials.map((m) => m.id) : [],
      );
    } else {
      setName('');
      setType('piece');
      setCustomType('');
      setImage(null);
      setProductType('ready_made');
      setLinkedIds([]);
    }
  }, [open, product]);

  // Load the book's materials the first time the manufacture section is shown.
  useEffect(() => {
    if (!open || productType !== 'manufacture' || materialsLoaded) return;
    let alive = true;
    (async () => {
      try {
        const data = await getMaterials(bookId);
        if (alive) {
          setAllMaterials(data.materials || []);
          setMaterialsLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load materials:', err);
        if (alive) setMaterialsLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [open, productType, materialsLoaded, bookId]);

  const linkedMaterials = useMemo(
    () => allMaterials.filter((m) => linkedIds.includes(m.id)),
    [allMaterials, linkedIds],
  );
  const availableMaterials = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allMaterials.filter(
      (m) => !linkedIds.includes(m.id) && (!q || m.name.toLowerCase().includes(q)),
    );
  }, [allMaterials, linkedIds, search]);

  const addSelected = () => {
    if (selectedId == null) {
      setError(t.selectMaterialFirst);
      return;
    }
    setError(null);
    setLinkedIds((prev) => (prev.includes(selectedId) ? prev : [...prev, selectedId]));
    setSelectedId(null);
  };

  const confirmUnlink = () => {
    if (!pendingUnlink) return;
    setLinkedIds((prev) => prev.filter((id) => id !== pendingUnlink.id));
    setPendingUnlink(null);
  };

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
    if (productType === 'manufacture' && linkedIds.length === 0) {
      setError(t.enterAtLeastOneMaterial);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveProduct({
        productId: product?.id ?? null,
        name: trimmed,
        quantityType,
        productType,
        materialIds: linkedIds,
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

            <div className={styles.materialSearchRow}>
              <input
                ref={searchRef}
                className="input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.materialSearchPlaceholder}
                aria-label={t.materialSearchPlaceholder}
              />
              <button
                type="button"
                className={styles.searchIconBtn}
                aria-label={t.searchAction}
                onClick={() => searchRef.current?.focus()}
              >
                <span className="material-symbols-outlined icon-md">search</span>
              </button>
              <button
                type="button"
                className={styles.materialAddBtn}
                onClick={addSelected}
                disabled={selectedId == null}
              >
                <span className="material-symbols-outlined icon-md">add</span>
                {t.add}
              </button>
            </div>

            {/* Already-added materials first, as compact removable chips. */}
            {linkedMaterials.length > 0 && (
              <>
                <span className={styles.materialSubLabel}>{t.addedMaterials}</span>
                <div className={styles.materialChips}>
                  {linkedMaterials.map((m) => (
                    <span
                      key={m.id}
                      className={styles.materialChip}
                      title={`${m.name} · ${formatNumber(m.current_stock || 0)} ${m.quantity_type || 'piece'}`}
                    >
                      <span className={styles.materialChipName}>{m.name}</span>
                      <button
                        type="button"
                        className={styles.materialChipRemove}
                        aria-label={t.unlinkMaterial}
                        onClick={() => setPendingUnlink(m)}
                      >
                        <span className="material-symbols-outlined icon-sm">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              </>
            )}

            {/* Remaining materials to pick from (click to select, then Add). */}
            <span className={styles.materialSubLabel}>{t.availableMaterials}</span>
            <div className={`${styles.materialList} ${styles.materialScroll}`}>
              {!materialsLoaded ? (
                <div className={styles.materialEmpty}>…</div>
              ) : availableMaterials.length === 0 ? (
                <div className={styles.materialEmpty}>{t.noMaterialsToLink}</div>
              ) : (
                availableMaterials.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`${styles.materialRow} ${selectedId === m.id ? styles.materialRowSelected : ''}`}
                    onClick={() => setSelectedId((cur) => (cur === m.id ? null : m.id))}
                    aria-pressed={selectedId === m.id}
                  >
                    <div className={styles.materialRowMain}>
                      <span className={styles.materialRowName} title={m.name}>
                        {m.name}
                      </span>
                      <span className={styles.materialRowMeta}>
                        {formatNumber(m.current_stock || 0)} {m.quantity_type || 'piece'}
                      </span>
                    </div>
                    {selectedId === m.id && (
                      <span className="material-symbols-outlined icon-md">check_circle</span>
                    )}
                  </button>
                ))
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

      <ConfirmDialog
        open={!!pendingUnlink}
        title={t.unlinkMaterial}
        message={t.unlinkMaterialConfirm}
        confirmLabel={t.deleteAction}
        onConfirm={confirmUnlink}
        onCancel={() => setPendingUnlink(null)}
      />
    </Modal>
  );
}
