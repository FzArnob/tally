import { useEffect, useRef, useState } from 'react';
import { Modal, ModalHeader } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
import { saveProduct } from '../../lib/api';
import type { Product } from '../../types';
import type { Translation } from '../../i18n/translations';
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
  onClose: () => void;
  onSaved: () => void;
}

export function ProductFormModal({ open, product, onClose, onSaved }: ProductFormModalProps) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('piece');
  const [customType, setCustomType] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isEdit = !!product;

  // Sync form when opening.
  useEffect(() => {
    if (!open) return;
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
    } else {
      setName('');
      setType('piece');
      setCustomType('');
      setImage(null);
    }
  }, [open, product]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      alert(t.enterProductName);
      return;
    }
    let quantityType = type;
    if (type === 'custom') {
      quantityType = customType.trim();
      if (!quantityType) {
        alert(t.enterQuantityType);
        return;
      }
    }
    setSaving(true);
    try {
      await saveProduct({
        productId: product?.id ?? null,
        name: trimmed,
        quantityType,
        imageUrl: image,
      });
      onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save product:', err);
      alert(t.failedSaveProduct);
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

        <div className={styles.actions}>
          <button className="btn btn-primary btn-block" onClick={submit} disabled={saving}>
            {isEdit ? t.saveChanges : t.addProduct}
          </button>
        </div>
      </div>
    </Modal>
  );
}
