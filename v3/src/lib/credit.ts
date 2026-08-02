import type { CreditLimits, Customer } from '../types';

/** Money comparisons run on stored decimals, so square must count as square. */
const EPSILON = 0.005;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Why a customer is flagged. Both halves can be true at once — someone can be
 * over the amount and late with it — and the dialog says so, because a
 * shopkeeper deciding whether to serve them wants both facts, not the first one.
 */
export interface CreditBreach {
  /** What they owe right now, as a positive number. */
  owed: number;
  /** Whole days the debt standing now has stood. Null if its start is unknown. */
  daysOwing: number | null;
  overLimit: boolean;
  overdue: boolean;
}

/**
 * Measure one customer against the book's rule.
 *
 * Returns null for anyone the rule has nothing to say about: they owe nothing,
 * or no limit is set, or they are inside both. Only a breach comes back, so a
 * caller can treat "got something" as "warn about this".
 *
 * A customer in credit is never flagged, whatever their history: the rule is
 * about what is outstanding, and nothing is.
 */
export function creditBreach(customer: Customer, limits: CreditLimits): CreditBreach | null {
  const owed = customer.total_balance < -EPSILON ? -customer.total_balance : 0;
  if (owed === 0) return null;

  const daysOwing = customer.debt_since
    ? Math.floor((Date.now() - new Date(customer.debt_since).getTime()) / MS_PER_DAY)
    : null;

  // Strictly past, not merely at: a limit of 5,000 permits owing 5,000, and a
  // week's grace is not spent until the week is up.
  const overLimit = limits.credit_limit != null && owed - limits.credit_limit > EPSILON;
  const overdue =
    limits.credit_days != null && daysOwing != null && daysOwing > limits.credit_days;

  if (!overLimit && !overdue) return null;
  return { owed, daysOwing, overLimit, overdue };
}

/** Substitute {name} placeholders in a translated phrase. */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);
}
