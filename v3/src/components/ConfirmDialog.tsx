import { Modal } from './Modal';
import { useI18n } from '../i18n/LanguageContext';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  busy,
}: ConfirmDialogProps) {
  const { t } = useI18n();
  return (
    <Modal open={open} onClose={onCancel} centered>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        <button className="btn btn-secondary btn-block" onClick={onCancel} disabled={busy}>
          {t.cancel}
        </button>
        <button className="btn btn-danger btn-block" onClick={onConfirm} disabled={busy}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
