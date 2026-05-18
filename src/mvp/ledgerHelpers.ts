import type { Service } from '../types';

export const TAX_RATE = 0.08925;

export type PaymentMethod = 'cash' | 'card' | 'check' | 'fleet';

export interface TicketLine {
  serviceId: string;
  name: string;
  price: number;
  category: Service['category'];
}

export interface MvpTicket {
  id: string;
  invoiceNum: number;
  createdAt: number;
  customerName: string;
  vehicleLabel: string;
  lines: TicketLine[];
  discount: number;
  payment: PaymentMethod;
}

export function subtotalForLines(lines: TicketLine[], discount: number): number {
  const raw = lines.reduce((s, l) => s + l.price, 0);
  return Math.max(0, raw - discount);
}

export function taxForSubtotal(subtotal: number): number {
  return Math.round(subtotal * TAX_RATE * 100) / 100;
}

export function totalForTicket(t: MvpTicket): number {
  const sub = subtotalForLines(t.lines, t.discount);
  return Math.round((sub + taxForSubtotal(sub)) * 100) / 100;
}

export function categoryRollup(lines: TicketLine[]): { oil: number; fluid: number; addon: number } {
  const o = { oil: 0, fluid: 0, addon: 0 };
  for (const l of lines) {
    if (l.category === 'oilchange') o.oil += l.price;
    else if (l.category === 'fluid') o.fluid += l.price;
    else o.addon += l.price;
  }
  return o;
}

export function aggregateCategory(tickets: MvpTicket[]): { oil: number; fluid: number; addon: number } {
  const o = { oil: 0, fluid: 0, addon: 0 };
  for (const t of tickets) {
    const r = categoryRollup(t.lines);
    o.oil += r.oil;
    o.fluid += r.fluid;
    o.addon += r.addon;
  }
  return o;
}

export function paymentTotals(tickets: MvpTicket[]): Record<PaymentMethod, number> {
  const p: Record<PaymentMethod, number> = {
    cash: 0,
    card: 0,
    check: 0,
    fleet: 0,
  };
  for (const t of tickets) {
    p[t.payment] += totalForTicket(t);
  }
  return p;
}

export function hourlyBuckets(tickets: MvpTicket[]): number[] {
  const hours = Array.from({ length: 12 }, () => 0);
  for (const t of tickets) {
    const d = new Date(t.createdAt);
    const h = d.getHours();
    if (h >= 7 && h <= 18) hours[h - 7] += 1;
  }
  return hours;
}
