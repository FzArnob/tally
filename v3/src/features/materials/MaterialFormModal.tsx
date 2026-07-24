import { useEffect, useRef, useState } from 'react';
import { Modal, ModalHeader } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
import { saveMaterial } from '../../lib/api';
import { ApiError, type Material } from '../../types';
import type { Translation } from '../../i18n/translations';
import { ImageCropperModal } from '../products/ImageCropperModal';
import styles from './materials.module.css';

const KNOWN_TYPES = ['piece', 'packet', 'cartoon', 'kg', 'liter'] as const;

const UNIT_LABELS: Record<(typeof KNOWN_TYPES)[number], keyof Translation> = {
  piece: 'unitPiece',
  packet: 'unitPacket',
  cartoon: 'unitCartoon',
  kg: 'unitKg',
  liter: 'unitLiter',
};

interface MaterialFormModalProps {
  open: boolean;
  material: Material | null;
  bookId: number;
  onClose: () => void;
  onSaved: () => void;
}

export function MaterialFormModal({
  open,
  material,
  bookId,
  onClose,
  onSaved,
}: MaterialFormModalProps) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('piece');
  const [customType, setCustomType] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isEdit = !!material;

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (material) {
      setName(material.name);
      const qt = material.quantity_type || 'piece';
      if ((KNOWN_TYPES as readonly string[]).includes(qt)) {
        setType(qt);
        setCustomType('');
      } else {
        setType('custom');
        setCustomType(qt);
      }
      setImage(material.image_url && material.image_url !== 'null' ? material.image_url : null);
    } else {
      setName('');
      setType('piece');
      setCustomType('');
      setImage(null);
    }
  }, [open, material]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t.enterMaterialName);
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
    setSaving(true);
    setError(null);
    try {
      await saveMaterial({
        materialId: material?.id ?? null,
        name: trimmed,
        quantityType,
        imageUrl: image,
        bookId,
      });
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'duplicate') {
        setError(t.duplicateMaterial);
      } else if (err instanceof ApiError && err.code === 'validation') {
        setError(err.message);
      } else {
        console.error('Failed to save material:', err);
        setError(t.failedSaveMaterial);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="materialFormTitle"
      header={
        <ModalHeader
          title={isEdit ? t.editMaterial : t.addMaterial}
          titleId="materialFormTitle"
          onClose={onClose}
          closeLabel={t.close}
        />
      }
    >
      <div className={styles.body}>
        <div className="field">
          <label>{t.materialImage}</label>
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
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
        </div>

        <div className="field">
          <label htmlFor="mName">{t.materialName}</label>
          <input
            id="mName"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.materialNamePlaceholder}
          />
        </div>

        <div className="field">
          <label htmlFor="mType">{t.quantityType}</label>
          <select
            id="mType"
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

        {error && <div className={styles.formError}>{error}</div>}

        <button className="btn btn-primary btn-block" onClick={submit} disabled={saving}>
          {isEdit ? t.saveChanges : t.addMaterial}
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
