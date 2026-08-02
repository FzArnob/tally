import { useCallback, useRef, useState } from 'react';

/** Round a money value to 2 decimals, returned as a clean input string. */
export const money = (n: number) => String(Math.round(n * 100) / 100);

/** Whether the single price field means the whole line or one unit of it. */
export type PriceMode = 'total' | 'unit';

/**
 * The quantity-and-price pair behind every goods form: a count, one price field,
 * and a toggle saying which way that field is read. The figure it isn't — the
 * per-unit when the field is a total, the total when it is per-unit — is derived
 * for the readout beneath, and both are always available to save.
 *
 * WHAT A CHANGE OF QUANTITY DOES. A unit price is a property of the goods; a
 * total is only ever what a quantity of them came to. So the unit price is what
 * is held when the count changes, and the total follows it: two of a thing that
 * went for ৳460 each is ৳920, not ৳460 split in half. In per-unit mode that is
 * already how it reads. In total mode the field is rewritten to match, which is
 * the whole point — the alternative silently halves a price nobody agreed to
 * change, and the readout is the only place it shows.
 *
 * The unit price it holds is remembered rather than recomputed, because clearing
 * the quantity box to retype it would otherwise lose it midway: "1" → "" → "2"
 * passes through a state where nothing is divisible. It stays null only while it
 * has genuinely never been known — a total typed before any count — and there
 * the total is left exactly as typed, since guessing at that point would be
 * inventing a figure rather than keeping one.
 */
export function useQuantityPrice() {
  const [qty, setQtyRaw] = useState('');
  const [price, setPriceRaw] = useState('');
  const [priceMode, setPriceMode] = useState<PriceMode>('total');

  // What one unit last cost, carried across edits so a change of quantity can
  // hold it. Null while that has never been determinable.
  const heldUnit = useRef<number | null>(null);

  const qtyNum = parseFloat(qty) || 0;
  const priceNum = parseFloat(price) || 0;
  const totalNum = priceMode === 'total' ? priceNum : priceNum * qtyNum;
  const unitNum = priceMode === 'unit' ? priceNum : qtyNum > 0 ? priceNum / qtyNum : 0;

  /** Typing in the price field, which is what fixes the unit price from here on. */
  const setPrice = (v: string) => {
    const n = parseFloat(v);
    if (v.trim() === '' || isNaN(n)) heldUnit.current = null;
    else if (priceMode === 'unit') heldUnit.current = n;
    else heldUnit.current = qtyNum > 0 ? n / qtyNum : null;
    setPriceRaw(v);
  };

  /** Typing in the quantity field. In total mode the total is rescaled to suit. */
  const setQty = (v: string) => {
    const next = parseFloat(v) || 0;
    if (priceMode === 'total' && price.trim() !== '' && next > 0) {
      if (heldUnit.current != null) setPriceRaw(money(heldUnit.current * next));
      // First count for a total typed without one: keep the total as typed, and
      // note what a unit therefore costs so the next change can hold it.
      else heldUnit.current = priceNum / next;
    }
    setQtyRaw(v);
  };

  /** Flip the toggle, converting the current value so it stays equivalent. */
  const switchMode = (m: PriceMode) => {
    if (m === priceMode) return;
    if (qtyNum > 0 && price.trim() !== '') {
      setPriceRaw(m === 'unit' ? money(unitNum) : money(totalNum));
    }
    setPriceMode(m);
  };

  /** Drop a known per-unit figure in — a recent price — and read the field that way. */
  const applyUnitPrice = useCallback((v: number) => {
    heldUnit.current = v;
    setPriceMode('unit');
    setPriceRaw(money(v));
  }, []);

  /**
   * Fill both fields for a new subject. The price arrives as a total, which is
   * what a stored entry is; pass null for one that has no price yet. Reads no
   * state, so it keeps one identity and an effect can seed on subject alone.
   */
  const seed = useCallback((nextQty: string, total: number | null) => {
    const q = parseFloat(nextQty) || 0;
    heldUnit.current = total != null && q > 0 ? total / q : null;
    setQtyRaw(nextQty);
    setPriceMode('total');
    setPriceRaw(total != null ? money(total) : '');
  }, []);

  return {
    qty,
    price,
    priceMode,
    qtyNum,
    priceNum,
    totalNum,
    unitNum,
    setQty,
    setPrice,
    switchMode,
    applyUnitPrice,
    seed,
  };
}
