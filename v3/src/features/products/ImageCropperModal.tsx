import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Modal } from '../../components/Modal';
import { useI18n } from '../../i18n/LanguageContext';
import styles from './products.module.css';

/** Final saved thumbnail size (square, px). */
const OUTPUT_SIZE = 150;
/** JPEG quality for the saved thumbnail. */
const OUTPUT_QUALITY = 0.82;
/** How far past "cover" the user may zoom in. */
const MAX_ZOOM = 4;

interface ImageCropperModalProps {
  open: boolean;
  /** Source image to crop (data URL from the picked/captured file). */
  src: string | null;
  onCancel: () => void;
  /** Receives a 150×150 JPEG data URL. */
  onConfirm: (dataUrl: string) => void;
}

/**
 * Square photo cropper. The user pans (drag) and zooms (slider / wheel / pinch)
 * to frame the picture inside a fixed square; confirming renders the visible
 * square to a 150×150 canvas and returns a compact JPEG data URL — so large
 * camera/gallery photos never reach the database at full size.
 */
export function ImageCropperModal({ open, src, onCancel, onConfirm }: ImageCropperModalProps) {
  const { t } = useI18n();
  const frameRef = useRef<HTMLDivElement>(null);
  const imgElRef = useRef<HTMLImageElement | null>(null);

  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [viewport, setViewport] = useState(0); // on-screen square size in px
  const [zoom, setZoom] = useState(1); // 1 == cover
  const [tx, setTx] = useState(0); // pan offset (screen px, from centre)
  const [ty, setTy] = useState(0);

  // Load the source to learn its natural dimensions.
  useEffect(() => {
    if (!open || !src) {
      setNat(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      imgElRef.current = img;
      setNat({ w: img.naturalWidth, h: img.naturalHeight });
      setZoom(1);
      setTx(0);
      setTy(0);
    };
    img.src = src;
  }, [open, src]);

  // Measure the on-screen square (responsive) and keep it current on resize.
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      if (frameRef.current) setViewport(frameRef.current.clientWidth);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [open, nat]);

  // "cover" scale: smallest scale that fills the square in both axes.
  const cover = nat && viewport ? Math.max(viewport / nat.w, viewport / nat.h) : 1;
  const scale = cover * zoom;
  const dispW = nat ? nat.w * scale : 0;
  const dispH = nat ? nat.h * scale : 0;

  // Keep the image covering the frame: clamp pan to the overflow on each axis.
  const clamp = useCallback(
    (x: number, y: number) => {
      const maxX = Math.max(0, (dispW - viewport) / 2);
      const maxY = Math.max(0, (dispH - viewport) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, x)),
        y: Math.min(maxY, Math.max(-maxY, y)),
      };
    },
    [dispW, dispH, viewport],
  );

  useEffect(() => {
    setTx((x) => clamp(x, ty).x);
    setTy((y) => clamp(tx, y).y);
    // Re-clamp whenever the framing maths change (zoom / viewport / image).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamp]);

  // ---- Pointer drag + pinch ----
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const pts = useRef<Map<number, { x: number; y: number }>>(new Map());

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      drag.current = null;
    } else {
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pts.current.has(e.pointerId)) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinch.current && pts.current.size >= 2) {
      const [a, b] = [...pts.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const next = Math.min(MAX_ZOOM, Math.max(1, pinch.current.zoom * (dist / pinch.current.dist)));
      setZoom(next);
      return;
    }
    if (drag.current && e.pointerId === drag.current.id) {
      const dx = e.clientX - drag.current.x;
      const dy = e.clientY - drag.current.y;
      drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      setTx((x) => clamp(x + dx, ty).x);
      setTy((y) => clamp(tx, y + dy).y);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pts.current.delete(e.pointerId);
    if (pts.current.size < 2) pinch.current = null;
    if (drag.current?.id === e.pointerId) drag.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    const next = Math.min(MAX_ZOOM, Math.max(1, zoom - e.deltaY * 0.0015));
    setZoom(next);
  };

  // ---- Produce the 150×150 thumbnail ----
  const confirm = () => {
    const img = imgElRef.current;
    if (!img || !nat || !viewport) return;
    // Map the visible square back to source-pixel coordinates.
    const srcSize = viewport / scale;
    const srcX = (dispW / 2 - viewport / 2 - tx) / scale;
    const srcY = (dispH / 2 - viewport / 2 - ty) / scale;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingQuality = 'high';
    // White matte so any transparency (e.g. PNG) doesn't turn black as JPEG.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    onConfirm(canvas.toDataURL('image/jpeg', OUTPUT_QUALITY));
  };

  const left = (viewport - dispW) / 2 + tx;
  const top = (viewport - dispH) / 2 + ty;

  return (
    <Modal open={open} onClose={onCancel} centered panelClassName={styles.cropDialog}>
      <div className={styles.cropBody}>
        <h3 className={styles.cropTitle}>{t.adjustPhoto}</h3>

        <div
          ref={frameRef}
          className={styles.cropFrame}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        >
          {src && nat && (
            <img
              className={styles.cropImg}
              src={src}
              alt=""
              draggable={false}
              style={{ width: dispW, height: dispH, left, top }}
            />
          )}
          <div className={styles.cropMask} aria-hidden />
        </div>

        <div className={styles.cropZoom}>
          <span className="material-symbols-outlined">image</span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            aria-label={t.zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          <span className="material-symbols-outlined">zoom_in</span>
        </div>

        <div className={styles.cropActions}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            {t.cancel}
          </button>
          <button type="button" className="btn btn-primary" onClick={confirm} disabled={!nat}>
            {t.usePhoto}
          </button>
        </div>
      </div>
    </Modal>
  );
}
