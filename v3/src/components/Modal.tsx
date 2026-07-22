import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Centered dialog (e.g. confirmations) instead of a bottom sheet. */
  centered?: boolean;
  /** Extra class for the panel. */
  panelClassName?: string;
  labelledBy?: string;
}

const EXIT_MS = 280;

/**
 * Accessible overlay that animates in as a bottom sheet (or centered dialog).
 * Handles backdrop click, Escape, body scroll-lock and exit animation.
 */
export function Modal({ open, onClose, children, centered, panelClassName, labelledBy }: ModalProps) {
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      setMounted(true);
      // Enter on the next frame so the transition plays.
      const raf = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(raf);
    }
    setEntered(false);
    closeTimer.current = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [open]);

  // Lock body scroll while any modal is mounted.
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div
      className={`${styles.overlay} ${centered ? styles.centered : ''} ${entered ? styles.open : ''}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`${centered ? styles.dialog : styles.sheet} ${panelClassName ?? ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
      >
        {children}
      </div>
    </div>
  );
}

interface ModalHeaderProps {
  title: ReactNode;
  onClose: () => void;
  closeLabel: string;
  titleId?: string;
  extra?: ReactNode;
}

export function ModalHeader({ title, onClose, closeLabel, titleId, extra }: ModalHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.headerTitle}>
        <h3 id={titleId}>{title}</h3>
        {extra}
      </div>
      <button className="icon-btn" onClick={onClose} aria-label={closeLabel}>
        <span className="material-symbols-outlined icon-lg">close</span>
      </button>
    </div>
  );
}
