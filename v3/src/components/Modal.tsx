import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  /** Fixed header rendered above the scrollable body (bottom-sheet modals). */
  header?: ReactNode;
  /** Fixed footer pinned to the bottom of the sheet, below the scrollable body. */
  footer?: ReactNode;
  /**
   * Fade the body's bottom edge into the footer while there's more to scroll to.
   * Defaults to on whenever a `footer` is present; pass `false` to opt out.
   */
  scrollFade?: boolean;
  /**
   * Drop the body's top padding, for bodies whose first child is sticky and must
   * pin flush against the header (the history lists' day bars).
   */
  flushBody?: boolean;
}

const EXIT_MS = 280;

/**
 * Open modals, oldest first. Escape only dismisses the topmost one, so closing
 * a nested sheet (e.g. "add material" over "add product") leaves its parent up.
 */
const escStack: object[] = [];

/**
 * Accessible overlay that animates in as a bottom sheet (or centered dialog).
 * For bottom sheets the optional `header` stays fixed while the body scrolls.
 * Handles backdrop click, Escape, body scroll-lock and exit animation.
 */
export function Modal({
  open,
  onClose,
  children,
  centered,
  panelClassName,
  labelledBy,
  header,
  footer,
  scrollFade,
  flushBody,
}: ModalProps) {
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const idRef = useRef({}); // stable identity for the Escape stack

  // A footered modal fades its body into the footer by default; `scrollFade`
  // overrides that either way.
  const fade = scrollFade ?? !!footer;

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

  // Escape closes this modal only while it is the topmost one.
  useEffect(() => {
    if (!open) return;
    const id = idRef.current;
    escStack.push(id);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (escStack[escStack.length - 1] !== id) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const at = escStack.lastIndexOf(id);
      if (at !== -1) escStack.splice(at, 1);
    };
  }, [open, onClose]);

  // Bottom fade: show only while the body can still scroll down (hidden at the
  // very bottom and when the content doesn't overflow at all). Recomputes on
  // scroll and whenever the body's size/content changes.
  useEffect(() => {
    if (!mounted || !fade) return;
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setCanScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 1);
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild); // catch content growth
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [mounted, fade, open]);

  if (!mounted) return null;

  // Portal to <body> so a modal is never trapped by an ancestor that creates a
  // containing block for fixed elements (transformed sheets, blurred header, …).
  return createPortal(
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
        {centered ? (
          children
        ) : (
          <>
            {header}
            <div
              ref={scrollRef}
              className={`${styles.scroll} ${footer ? '' : styles.scrollNoFooter} ${
                flushBody ? styles.scrollFlushTop : ''
              } ${fade && canScrollDown ? styles.scrollFade : ''}`}
            >
              {children}
            </div>
            {footer}
          </>
        )}
      </div>
    </div>,
    document.body,
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
