import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, ModalHeader } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
import { getMaterials, getProductMaterials, saveProduct } from '../../lib/api';
import { ApiError, type Material, type Product, type ProductType } from '../../types';
import type { Translation } from '../../i18n/translations';
import { ImageCropperModal } from './ImageCropperModal';
import { MaterialFormModal } from '../materials/MaterialFormModal';
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
  bookId: string;
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
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('piece');
  const [customType, setCustomType] = useState('');
  const [productType, setProductType] = useState<ProductType>('ready_made');

  // Manufacture material picker.
  const [allMaterials, setAllMaterials] = useState<Material[]>([]);
  const [materialsLoaded, setMaterialsLoaded] = useState(false);
  const [linkedIds, setLinkedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [materialFormOpen, setMaterialFormOpen] = useState(false);

  const [image, setImage] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isEdit = !!product;

  // Seed only when the modal switches subject (a new product, or a different
  // one to edit). Reopening the same subject keeps whatever was typed — and the
  // materials already fetched — so closing the sheet never throws work away.
  // Cleared on a successful save.
  const seededFor = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const subject = product ? `edit:${product.id}` : 'new';
    if (seededFor.current === subject) return;
    seededFor.current = subject;

    setError(null);
    setSearch('');
    setAllMaterials([]);
    setMaterialsLoaded(false);
    setLinkedIds([]);
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
    } else {
      setName('');
      setType('piece');
      setCustomType('');
      setImage(null);
      setProductType('ready_made');
    }

    // A manufacture product's links aren't in the list payload — fetch them.
    if (!product || product.product_type !== 'manufacture') return;
    let alive = true;
    (async () => {
      try {
        const data = await getProductMaterials(product.id);
        if (alive) setLinkedIds(data.materials.map((m) => m.id));
      } catch (err) {
        console.error('Failed to load linked materials:', err);
      }
    })();
    return () => {
      alive = false;
    };
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

  // "No materials found — add them in {link} first." The placeholder becomes a
  // link to the Material Costs page, which opens its add form on arrival.
  const [emptyBefore, emptyAfter = ''] = t.noMaterialsToLink.split('{link}');

  const goToMaterials = () => {
    onClose();
    navigate(`/${bookId}/materials`, { state: { addMaterial: true } });
  };

  // One tap links, one tap unlinks — no select-then-confirm round trip.
  const link = (id: string) => {
    setError(null);
    setLinkedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const unlink = (id: string) => setLinkedIds((prev) => prev.filter((x) => x !== id));

  /** A material created from inside this form: drop it in and link it at once. */
  const onMaterialCreated = (created: Material) => {
    setAllMaterials((prev) =>
      [...prev.filter((m) => m.id !== created.id), created].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    );
    setMaterialsLoaded(true);
    setSearch('');
    link(created.id);
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
      // The draft is done with — let the next open start from scratch.
      seededFor.current = null;
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
      footer={
        <>
          {error && (
            <div className={styles.formError} style={{ marginBottom: '0.75rem' }}>
              {error}
            </div>
          )}
          <button className="btn btn-primary btn-block btn-margin" onClick={submit} disabled={saving}>
            {isEdit ? t.saveChanges : t.addProduct}
          </button>
        </>
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
                className="input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.materialSearchPlaceholder}
                aria-label={t.materialSearchPlaceholder}
              />
              {/* Missing a material? Create it here — it lands linked. */}
              <button
                type="button"
                className={styles.materialAddBtn}
                onClick={() => setMaterialFormOpen(true)}
              >
                <span className="material-symbols-outlined icon-md">add</span>
                {t.addMaterial}
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
                        onClick={() => unlink(m.id)}
                      >
                        <span className="material-symbols-outlined icon-sm">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              </>
            )}

            {/* Remaining materials — tapping a row links it straight away. */}
            <span className={styles.materialSubLabel}>{t.availableMaterials}</span>
            <div className={styles.materialList}>
              {!materialsLoaded ? (
                <div className={styles.materialEmpty}>…</div>
              ) : availableMaterials.length === 0 ? (
                <div className={styles.materialEmpty}>
                  {emptyBefore}
                  <button
                    type="button"
                    className={styles.materialEmptyLink}
                    onClick={goToMaterials}
                  >
                    {t.materialsTitle}
                  </button>
                  {emptyAfter}
                </div>
              ) : (
                availableMaterials.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={styles.materialRow}
                    onClick={() => link(m.id)}
                  >
                    <span className={`material-symbols-outlined icon-md ${styles.materialRowAdd}`}>
                      add_circle
                    </span>
                    <div className={styles.materialRowMain}>
                      <span className={styles.materialRowName} title={m.name}>
                        {m.name}
                      </span>
                      <span className={styles.materialRowMeta}>
                        {formatNumber(m.current_stock || 0)} {m.quantity_type || 'piece'}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
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

      {/* Create a material without leaving the product — its own draft is kept
          too, so closing this sheet loses nothing either. */}
      <MaterialFormModal
        open={materialFormOpen}
        material={null}
        bookId={bookId}
        onClose={() => setMaterialFormOpen(false)}
        onSaved={onMaterialCreated}
      />
    </Modal>
  );
}
