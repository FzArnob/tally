import { useCallback, useRef } from 'react';

interface LongPressOptions {
  onClick?: () => void;
  onLongPress: () => void;
  delay?: number;
}

/**
 * Distinguishes a tap/click from a long-press on the same element, for both
 * mouse and touch. Mirrors the grid/row press behaviour in v1.
 */
export function useLongPress({ onClick, onLongPress, delay = 550 }: LongPressOptions) {
  const timer = useRef<number | null>(null);
  const firedLong = useRef(false);

  const start = useCallback(() => {
    firedLong.current = false;
    timer.current = window.setTimeout(() => {
      firedLong.current = true;
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    cancel();
    if (firedLong.current) {
      firedLong.current = false;
      return; // long-press already handled this interaction
    }
    onClick?.();
  }, [cancel, onClick]);

  return {
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchMove: cancel,
    onClick: handleClick,
  };
}
