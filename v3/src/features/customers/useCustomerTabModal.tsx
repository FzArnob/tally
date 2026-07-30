import { useCallback, useState } from 'react';
import { getCustomer } from '../../lib/api';
import type { Customer } from '../../types';
import { CustomerItemsModal } from './CustomerItemsModal';

/**
 * Opens a customer's tab from somewhere that only knows their id — the product
 * and material histories, which label tab sales with the customer's name.
 *
 * The sheet needs the whole customer (balance, phone, book), so the id is
 * resolved on demand rather than widening the history payload for a modal that
 * is usually never opened.
 *
 * `onChanged` fires when items are added or settled in there; the caller should
 * reload whatever it shows, since settling flips the history's Unpaid pills.
 */
export function useCustomerTabModal(onChanged?: () => void) {
  const [customer, setCustomer] = useState<Customer | null>(null);

  const openCustomerTab = useCallback(async (customerId: string) => {
    try {
      const { customer } = await getCustomer(customerId);
      setCustomer(customer);
    } catch (err) {
      // A deleted customer is the realistic case; the history keeps its label.
      console.error('Failed to open customer tab:', err);
    }
  }, []);

  const customerTabModal = (
    <CustomerItemsModal
      customer={customer}
      onClose={() => setCustomer(null)}
      onChanged={() => onChanged?.()}
    />
  );

  return { openCustomerTab, customerTabModal };
}
