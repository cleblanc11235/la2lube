import type { Service } from '../types';

const toCents = (n: number) => Math.round(n * 100) / 100;

/** Subtotal, tax and total for a set of services, rounded to the cent the way a receipt shows them. */
export function ticketTotals(lines: Service[], taxRate: number) {
  const subtotal = toCents(lines.reduce((sum, s) => sum + s.price, 0));
  const tax = toCents(subtotal * taxRate);
  return { subtotal, tax, total: toCents(subtotal + tax) };
}
