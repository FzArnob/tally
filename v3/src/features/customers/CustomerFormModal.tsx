import { useEffect, useRef, useState } from 'react';
import { Modal, ModalHeader } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
import { createCustomer, updateCustomer } from '../../lib/api';
import { ApiError, type Customer } from '../../types';
import styles from './customers.module.css';

interface CustomerFormModalProps {
  open: boolean;
  customer: Customer | null; // null => add
  bookId: number;
  onClose: () => void;
  onSaved: () => void;
}

export function CustomerFormModal({
  open,
  customer,
  bookId,
  onClose,
  onSaved,
}: CustomerFormModalProps) {
  const { t } = useI18n();
  const editing = !!customer;

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [showNickname, setShowNickname] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nicknameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(customer?.name ?? '');
    setNickname(customer?.nickname ?? '');
    setPhone(customer?.phone ?? '');
    setAddress(customer?.address ?? '');
    setShowNickname(!!customer?.nickname);
    setError(null);
    setBusy(false);
  }, [open, customer]);

  const nickVisible = editing || showNickname;

  const submit = async () => {
    if (busy) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t.nameRequired);
      return;
    }
    if (trimmedName.length > 100) {
      setError(t.nameTooLong);
      return;
    }
    if (phone.trim() && !/^[0-9+\-() ]{3,30}$/.test(phone.trim())) {
      setError(t.invalidPhone);
      return;
    }

    setBusy(true);
    setError(null);
    const payload = {
      name: trimmedName,
      nickname: nickname.trim(),
      phone: phone.trim(),
      address: address.trim(),
    };
    try {
      if (editing && customer) {
        await updateCustomer(customer.id, payload);
      } else {
        await createCustomer({ ...payload, bookId });
      }
      onSaved();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'nickname_required') {
        setShowNickname(true);
        setError(t.nicknameRequiredHint);
        setTimeout(() => nicknameRef.current?.focus(), 50);
      } else if (err instanceof ApiError && err.code === 'duplicate') {
        setError(t.duplicateCustomer);
      } else if (err instanceof ApiError && err.code === 'validation') {
        setError(err.message);
      } else {
        console.error('Failed to save customer:', err);
        setError(t.failedSaveCustomer);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="custFormTitle"
      header={
        <ModalHeader
          title={editing ? t.editCustomer : t.addCustomer}
          titleId="custFormTitle"
          onClose={onClose}
          closeLabel={t.close}
        />
      }
    >
      <div className={styles.form}>
        <div className="field">
          <label htmlFor="custName">{t.customerName}</label>
          <input
            id="custName"
            className="input"
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.customerName}
            autoFocus={!editing}
          />
        </div>

        {nickVisible && (
          <div className="field">
            <label htmlFor="custNick">
              {t.nickname} <span className={styles.optional}>({t.optional})</span>
            </label>
            <input
              id="custNick"
              ref={nicknameRef}
              className="input"
              value={nickname}
              maxLength={100}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t.nicknamePlaceholder}
            />
          </div>
        )}

        <div className="field">
          <label htmlFor="custPhone">
            {t.phone} <span className={styles.optional}>({t.optional})</span>
          </label>
          <input
            id="custPhone"
            className="input"
            type="tel"
            inputMode="tel"
            value={phone}
            maxLength={30}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t.phonePlaceholder}
          />
        </div>

        <div className="field">
          <label htmlFor="custAddr">
            {t.address} <span className={styles.optional}>({t.optional})</span>
          </label>
          <textarea
            id="custAddr"
            className="textarea"
            rows={2}
            value={address}
            maxLength={255}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t.addressPlaceholder}
          />
        </div>

        {error && <div className={styles.formError}>{error}</div>}

        <button className="btn btn-primary btn-block" onClick={submit} disabled={busy}>
          {editing ? t.saveCustomer : t.addCustomer}
        </button>
      </div>
    </Modal>
  );
}
