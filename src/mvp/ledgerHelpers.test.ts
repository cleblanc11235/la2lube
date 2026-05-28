import { describe, it, expect } from 'vitest';
import {
  TAX_RATE,
  type TicketLine,
  type MvpTicket,
  type PaymentMethod,
  subtotalForLines,
  taxForSubtotal,
  totalForTicket,
  categoryRollup,
  aggregateCategory,
  paymentTotals,
  hourlyBuckets,
} from './ledgerHelpers';

// Helper factory for creating TicketLine objects
const line = (
  serviceId: string,
  name: string,
  price: number,
  category: 'oilchange' | 'fluid' | 'addon'
): TicketLine => ({
  serviceId,
  name,
  price,
  category,
});

// Helper factory for creating MvpTicket objects
const ticket = (
  lines: TicketLine[],
  discount: number,
  payment: PaymentMethod,
  createdAt: number,
  id = 'test-ticket-1',
  invoiceNum = 1001
): MvpTicket => ({
  id,
  invoiceNum,
  createdAt,
  customerName: 'Test Customer',
  vehicleLabel: '2021 Ford F-150',
  lines,
  discount,
  payment,
});

describe('subtotalForLines', () => {
  it('returns sum of all prices when discount is 0', () => {
    const lines = [
      line('oil-full', 'Full Synthetic', 74.99, 'oilchange'),
      line('addon-cabin', 'Cabin Filter', 29.99, 'addon'),
      line('fluid-transmission', 'Transmission Flush', 129.99, 'fluid'),
    ];

    const result = subtotalForLines(lines, 0);

    expect(result).toBe(234.97);
  });

  it('returns sum minus discount when discount is partial', () => {
    const lines = [
      line('oil-full', 'Full Synthetic', 74.99, 'oilchange'),
      line('addon-cabin', 'Cabin Filter', 29.99, 'addon'),
    ];

    const result = subtotalForLines(lines, 10);

    // Floating point precision: 74.99 + 29.99 - 10 = 94.97999999999999
    expect(result).toBeCloseTo(94.98, 2);
  });

  it('clamps to 0 when discount is larger than sum', () => {
    const lines = [line('addon-cabin', 'Cabin Filter', 29.99, 'addon')];

    const result = subtotalForLines(lines, 50);

    expect(result).toBe(0);
  });

  it('returns 0 for empty lines array', () => {
    const result = subtotalForLines([], 0);

    expect(result).toBe(0);
  });

  it('returns 0 for empty lines array with discount', () => {
    const result = subtotalForLines([], 10);

    expect(result).toBe(0);
  });
});

describe('taxForSubtotal', () => {
  it('calculates tax correctly for $100', () => {
    const result = taxForSubtotal(100);

    // 100 * 0.08925 = 8.925
    // Math.round uses banker's rounding: 8.925 rounds to 8.92 (round to even)
    expect(result).toBe(8.92);
  });

  it('returns 0 for subtotal of 0', () => {
    const result = taxForSubtotal(0);

    expect(result).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    const result = taxForSubtotal(74.99);

    // 74.99 * 0.08925 = 6.6928275
    // round(6.6928275 * 100) / 100 = 669 / 100 = 6.69
    expect(result).toBe(6.69);
  });

  it('uses the correct tax rate', () => {
    const result = taxForSubtotal(100);

    const expected = Math.round(100 * TAX_RATE * 100) / 100;
    expect(result).toBe(expected);
  });

  it('handles large subtotals correctly', () => {
    const result = taxForSubtotal(1000);

    // 1000 * 0.08925 = 89.25
    expect(result).toBe(89.25);
  });
});

describe('totalForTicket', () => {
  it('calculates correct total with no discount', () => {
    const lines = [line('oil-full', 'Full Synthetic', 74.99, 'oilchange')];
    const t = ticket(lines, 0, 'cash', Date.now());

    const result = totalForTicket(t);

    // Subtotal: 74.99
    // Tax: 74.99 * 0.08925 = 6.6928... → 6.69
    // Total: 74.99 + 6.69 = 81.68
    expect(result).toBe(81.68);
  });

  it('applies discount before calculating tax', () => {
    const lines = [
      line('oil-full', 'Full Synthetic', 74.99, 'oilchange'),
      line('addon-cabin', 'Cabin Filter', 29.99, 'addon'),
    ];
    const t = ticket(lines, 5, 'cash', Date.now());

    const result = totalForTicket(t);

    // Subtotal: 104.98 - 5 = 99.98
    // Tax: 99.98 * 0.08925 = 8.9182... → 8.92
    // Total: 99.98 + 8.92 = 108.90
    expect(result).toBe(108.9);
  });

  it('rounds final total to 2 decimal places', () => {
    const lines = [line('oil-full', 'Full Synthetic', 74.99, 'oilchange')];
    const t = ticket(lines, 0, 'cash', Date.now());

    const result = totalForTicket(t);

    // Verify it's a clean decimal with max 2 places
    expect(result.toFixed(2)).toBe(result.toString());
  });

  it('handles empty ticket', () => {
    const t = ticket([], 0, 'cash', Date.now());

    const result = totalForTicket(t);

    expect(result).toBe(0);
  });

  it('handles ticket where discount equals subtotal', () => {
    const lines = [line('addon-cabin', 'Cabin Filter', 29.99, 'addon')];
    const t = ticket(lines, 29.99, 'cash', Date.now());

    const result = totalForTicket(t);

    expect(result).toBe(0);
  });
});

describe('categoryRollup', () => {
  it('correctly categorizes mixed lines', () => {
    const lines = [
      line('oil-full', 'Full Synthetic', 74.99, 'oilchange'),
      line('fluid-transmission', 'Transmission Flush', 129.99, 'fluid'),
      line('addon-cabin', 'Cabin Filter', 29.99, 'addon'),
    ];

    const result = categoryRollup(lines);

    expect(result).toEqual({
      oil: 74.99,
      fluid: 129.99,
      addon: 29.99,
    });
  });

  it('sums multiple items in same category', () => {
    const lines = [
      line('oil-full', 'Full Synthetic', 74.99, 'oilchange'),
      line('oil-synthetic-blend', 'Synthetic Blend', 54.99, 'oilchange'),
    ];

    const result = categoryRollup(lines);

    expect(result).toEqual({
      oil: 129.98,
      fluid: 0,
      addon: 0,
    });
  });

  it('returns all zeros for empty lines array', () => {
    const result = categoryRollup([]);

    expect(result).toEqual({
      oil: 0,
      fluid: 0,
      addon: 0,
    });
  });

  it('handles single category', () => {
    const lines = [
      line('addon-cabin', 'Cabin Filter', 29.99, 'addon'),
      line('addon-air', 'Air Filter', 24.99, 'addon'),
    ];

    const result = categoryRollup(lines);

    expect(result).toEqual({
      oil: 0,
      fluid: 0,
      addon: 54.98,
    });
  });
});

describe('aggregateCategory', () => {
  it('sums categories across multiple tickets', () => {
    const t1 = ticket(
      [
        line('oil-full', 'Full Synthetic', 74.99, 'oilchange'),
        line('addon-cabin', 'Cabin Filter', 29.99, 'addon'),
      ],
      0,
      'cash',
      Date.now()
    );

    const t2 = ticket(
      [
        line('fluid-transmission', 'Transmission Flush', 129.99, 'fluid'),
        line('addon-air', 'Air Filter', 24.99, 'addon'),
      ],
      0,
      'card',
      Date.now()
    );

    const result = aggregateCategory([t1, t2]);

    expect(result).toEqual({
      oil: 74.99,
      fluid: 129.99,
      addon: 54.98,
    });
  });

  it('returns all zeros for empty tickets array', () => {
    const result = aggregateCategory([]);

    expect(result).toEqual({
      oil: 0,
      fluid: 0,
      addon: 0,
    });
  });

  it('handles tickets with empty lines', () => {
    const t1 = ticket([], 0, 'cash', Date.now());
    const t2 = ticket([line('oil-full', 'Full Synthetic', 74.99, 'oilchange')], 0, 'card', Date.now());

    const result = aggregateCategory([t1, t2]);

    expect(result).toEqual({
      oil: 74.99,
      fluid: 0,
      addon: 0,
    });
  });

  it('accumulates same category from multiple tickets', () => {
    const t1 = ticket([line('oil-full', 'Full Synthetic', 74.99, 'oilchange')], 0, 'cash', Date.now());
    const t2 = ticket([line('oil-synthetic-blend', 'Synthetic Blend', 54.99, 'oilchange')], 0, 'card', Date.now());
    const t3 = ticket([line('oil-conventional', 'Conventional', 34.99, 'oilchange')], 0, 'cash', Date.now());

    const result = aggregateCategory([t1, t2, t3]);

    expect(result).toEqual({
      oil: 164.97,
      fluid: 0,
      addon: 0,
    });
  });
});

describe('paymentTotals', () => {
  it('calculates correct total for single cash ticket', () => {
    const lines = [line('oil-full', 'Full Synthetic', 74.99, 'oilchange')];
    const t = ticket(lines, 0, 'cash', Date.now());

    const result = paymentTotals([t]);

    // Total: 74.99 + tax (6.69) = 81.68
    expect(result.cash).toBe(81.68);
    expect(result.card).toBe(0);
    expect(result.check).toBe(0);
    expect(result.fleet).toBe(0);
  });

  it('calculates correct totals for mixed payment methods', () => {
    const lines1 = [line('oil-full', 'Full Synthetic', 74.99, 'oilchange')];
    const lines2 = [line('fluid-transmission', 'Transmission Flush', 129.99, 'fluid')];
    const lines3 = [line('addon-cabin', 'Cabin Filter', 29.99, 'addon')];

    const t1 = ticket(lines1, 0, 'cash', Date.now());
    const t2 = ticket(lines2, 0, 'card', Date.now());
    const t3 = ticket(lines3, 0, 'check', Date.now());

    const result = paymentTotals([t1, t2, t3]);

    // t1: 74.99 + 6.69 = 81.68
    // t2: 129.99 + 11.60 = 141.59
    // t3: 29.99 + 2.68 = 32.67
    expect(result.cash).toBe(81.68);
    expect(result.card).toBe(141.59);
    expect(result.check).toBe(32.67);
    expect(result.fleet).toBe(0);
  });

  it('returns all zeros for empty tickets array', () => {
    const result = paymentTotals([]);

    expect(result).toEqual({
      cash: 0,
      card: 0,
      check: 0,
      fleet: 0,
    });
  });

  it('sums multiple tickets with same payment method', () => {
    const lines1 = [line('oil-full', 'Full Synthetic', 74.99, 'oilchange')];
    const lines2 = [line('oil-synthetic-blend', 'Synthetic Blend', 54.99, 'oilchange')];

    const t1 = ticket(lines1, 0, 'cash', Date.now());
    const t2 = ticket(lines2, 0, 'cash', Date.now());

    const result = paymentTotals([t1, t2]);

    // t1: 74.99 + 6.69 = 81.68
    // t2: 54.99 + 4.91 = 59.90
    // Total cash: 141.58
    expect(result.cash).toBe(141.58);
  });

  it('handles fleet payment method', () => {
    const lines = [line('oil-full', 'Full Synthetic', 74.99, 'oilchange')];
    const t = ticket(lines, 0, 'fleet', Date.now());

    const result = paymentTotals([t]);

    expect(result.fleet).toBe(81.68);
    expect(result.cash).toBe(0);
  });
});

describe('hourlyBuckets', () => {
  it('places ticket at 7am in first bucket (index 0)', () => {
    const d = new Date('2026-05-20T07:00:00');
    const lines = [line('oil-full', 'Full Synthetic', 74.99, 'oilchange')];
    const t = ticket(lines, 0, 'cash', d.getTime());

    const result = hourlyBuckets([t]);

    expect(result).toHaveLength(12);
    expect(result[0]).toBe(1);
    expect(result.slice(1).every((count) => count === 0)).toBe(true);
  });

  it('places ticket at 6pm in last bucket (index 11)', () => {
    const d = new Date('2026-05-20T18:00:00');
    const lines = [line('oil-full', 'Full Synthetic', 74.99, 'oilchange')];
    const t = ticket(lines, 0, 'cash', d.getTime());

    const result = hourlyBuckets([t]);

    expect(result).toHaveLength(12);
    expect(result[11]).toBe(1);
    expect(result.slice(0, 11).every((count) => count === 0)).toBe(true);
  });

  it('ignores ticket before 7am', () => {
    const d = new Date('2026-05-20T06:59:59');
    const lines = [line('oil-full', 'Full Synthetic', 74.99, 'oilchange')];
    const t = ticket(lines, 0, 'cash', d.getTime());

    const result = hourlyBuckets([t]);

    expect(result).toHaveLength(12);
    expect(result.every((count) => count === 0)).toBe(true);
  });

  it('ignores ticket after 6pm', () => {
    const d = new Date('2026-05-20T19:00:00');
    const lines = [line('oil-full', 'Full Synthetic', 74.99, 'oilchange')];
    const t = ticket(lines, 0, 'cash', d.getTime());

    const result = hourlyBuckets([t]);

    expect(result).toHaveLength(12);
    expect(result.every((count) => count === 0)).toBe(true);
  });

  it('returns array of length 12', () => {
    const result = hourlyBuckets([]);

    expect(result).toHaveLength(12);
    expect(result.every((count) => count === 0)).toBe(true);
  });

  it('distributes multiple tickets across hours correctly', () => {
    const lines = [line('oil-full', 'Full Synthetic', 74.99, 'oilchange')];

    const t1 = ticket(lines, 0, 'cash', new Date('2026-05-20T08:00:00').getTime(), 't1');
    const t2 = ticket(lines, 0, 'cash', new Date('2026-05-20T08:30:00').getTime(), 't2');
    const t3 = ticket(lines, 0, 'cash', new Date('2026-05-20T12:00:00').getTime(), 't3');
    const t4 = ticket(lines, 0, 'cash', new Date('2026-05-20T17:00:00').getTime(), 't4');

    const result = hourlyBuckets([t1, t2, t3, t4]);

    expect(result).toHaveLength(12);
    expect(result[1]).toBe(2); // 8am is index 1 (hour 8 - 7 = 1)
    expect(result[5]).toBe(1); // 12pm is index 5 (hour 12 - 7 = 5)
    expect(result[10]).toBe(1); // 5pm is index 10 (hour 17 - 7 = 10)
  });

  it('handles edge case at exactly 6am (hour 6)', () => {
    const d = new Date('2026-05-20T06:00:00');
    const lines = [line('oil-full', 'Full Synthetic', 74.99, 'oilchange')];
    const t = ticket(lines, 0, 'cash', d.getTime());

    const result = hourlyBuckets([t]);

    expect(result.every((count) => count === 0)).toBe(true);
  });

  it('includes hour 18 (6pm)', () => {
    const d = new Date('2026-05-20T18:30:00');
    const lines = [line('oil-full', 'Full Synthetic', 74.99, 'oilchange')];
    const t = ticket(lines, 0, 'cash', d.getTime());

    const result = hourlyBuckets([t]);

    // Hour 18 should be included (index 11)
    expect(result[11]).toBe(1);
  });

  it('correctly maps noon (12pm) to index 5', () => {
    const d = new Date('2026-05-20T12:00:00');
    const lines = [line('oil-full', 'Full Synthetic', 74.99, 'oilchange')];
    const t = ticket(lines, 0, 'cash', d.getTime());

    const result = hourlyBuckets([t]);

    expect(result[5]).toBe(1); // hour 12 - 7 = 5
  });
});
