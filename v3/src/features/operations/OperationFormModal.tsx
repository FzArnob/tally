import { useEffect, useRef, useState } from 'react';
import { Modal, ModalHeader } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
import { saveOperationCost } from '../../lib/api';
import { ApiError, type OperationCost } from '../../types';
import styles from './operations.module.css';

interface OperationFormModalProps {
  open: boolean;
  operation: OperationCost | null;
  bookId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function OperationFormModal({
  open,
  operation,
  bookId,
  onClose,
  onSaved,
}: OperationFormModalProps) {
  const { t } = useI18n();
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!operation;

  // Seed only when the modal switches subject; reopening the same one keeps
  // what was typed, so closing is never destructive. Cleared on a save.
  const seededFor = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const subject = operation ? `edit:${operation.id}` : 'new';
    if (seededFor.current === subject) return;
    seededFor.current = subject;
    setError(null);
    if (operation) {
      setReason(operation.reason);
      setNote(operation.note);
    } else {
      setReason('');
      setNote('');
    }
  }, [open, operation]);

  const submit = async () => {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError(t.enterReason);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveOperationCost({
        operationCostId: operation?.id ?? null,
        bookId,
        reason: trimmedReason,
        note: note.trim(),
      });
      seededFor.current = null;
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'duplicate') {
        setError(t.duplicateOperation);
      } else if (err instanceof ApiError && err.code === 'validation') {
        setError(err.message);
      } else {
        console.error('Failed to save operation cost:', err);
        setError(t.failedSaveOperation);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="operationFormTitle"
      header={
        <ModalHeader
          title={isEdit ? t.editOperation : t.addOperation}
          titleId="operationFormTitle"
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
            {isEdit ? t.saveChanges : t.addOperation}
          </button>
        </>
      }
    >
      <div className={styles.body}>
        <div className="field">
          <label htmlFor="opReason">{t.reason}</label>
          <input
            id="opReason"
            className="input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t.reasonPlaceholder}
          />
        </div>

        <div className="field">
          <label htmlFor="opNote">{t.note}</label>
          <textarea
            id="opNote"
            className="textarea"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t.notePlaceholder}
          />
        </div>

      </div>
    </Modal>
  );
}
