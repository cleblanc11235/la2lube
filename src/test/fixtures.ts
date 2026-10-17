import type { Customer, Service, Ticket } from '../types';
import { createMemoryStore } from '../data/store';

// Made-up customers and visit history for tests only. The app itself starts
// with no customers; tests hand these to a memory store (see renderWithApp).

const getDateMonthsAgo = (months: number): string => {
  const date = new Date('2026-03-24');
  date.setMonth(date.getMonth() - months);
  return date.toISOString();
};

export const testCustomers: Customer[] = [
  {
    id: 'cust-1',
    name: 'Mike Johnson',
    phone: '(318) 555-1234',
    vehicles: [{ id: 'veh-1', year: 2021, make: 'Ford', model: 'F-150', engine: '5.0L', plate: 'LSU 4477' }],
  },
  {
    id: 'cust-2',
    name: 'Sandra Lee',
    phone: '(318) 555-9876',
    vehicles: [{ id: 'veh-2', year: 2018, make: 'Chevy', model: 'Silverado', engine: '5.3L', plate: 'RED 1122' }],
  },
  {
    id: 'cust-3',
    name: 'Robert Williams',
    phone: '(318) 555-4422',
    vehicles: [{ id: 'veh-3', year: 2020, make: 'Toyota', model: 'Camry', engine: '2.5L', plate: 'CAM 7890' }],
  },
  {
    id: 'cust-4',
    name: 'Debra Fontenot',
    phone: '(318) 555-7711',
    vehicles: [{ id: 'veh-4', year: 2015, make: 'Honda', model: 'Civic', engine: '1.8L', plate: 'HON 2233' }],
  },
];

/**
 * A fixed-price catalog for history fixtures and recommendation tests,
 * including the fluid and filter services recommendations look for.
 */
export const testServices: Service[] = [
  { id: 'oil-conventional', name: 'Conventional Oil Change', price: 34.99, category: 'oilchange' },
  { id: 'oil-blend', name: 'Synthetic Blend Oil Change', price: 54.99, category: 'oilchange' },
  { id: 'oil-synthetic', name: 'Full Synthetic Oil Change', price: 74.99, category: 'oilchange' },
  { id: 'oil-highmileage', name: 'High-Mileage Oil Change', price: 64.99, category: 'oilchange' },
  { id: 'fluid-transmission', name: 'Transmission Flush', price: 129.99, category: 'fluid' },
  { id: 'fluid-coolant', name: 'Coolant Flush', price: 99.99, category: 'fluid' },
  { id: 'addon-air', name: 'Air Filter', price: 24.99, category: 'addon' },
  { id: 'addon-cabin', name: 'Cabin Air Filter', price: 29.99, category: 'addon' },
  { id: 'addon-wipers', name: 'Wiper Blades', price: 24.99, category: 'addon' },
  { id: 'addon-rotation', name: 'Tire Rotation', price: 19.99, category: 'addon' },
  { id: 'addon-vacuum', name: 'Interior Vacuum', price: 14.99, category: 'addon' },
  { id: 'addon-battery', name: 'Battery Test', price: 0.0, category: 'addon' },
  { id: 'addon-topoff', name: 'Fluid Top-Off', price: 0.0, category: 'addon' },
];

const service = (name: string): Service => {
  const found = testServices.find((s) => s.name === name);
  if (!found) throw new Error(`No service named ${name}`);
  return found;
};

let invoice = 900;

/** A closed-out past visit. */
export function paidTicket(
  customerId: string,
  vehicleId: string,
  paidAt: string,
  mileage: number,
  serviceNames: string[],
  total: number,
  paymentMethod: Ticket['paymentMethod'] = 'card'
): Ticket {
  const customer = testCustomers.find((c) => c.id === customerId)!;
  const vehicle = customer.vehicles.find((v) => v.id === vehicleId)!;
  return {
    id: `hist-${vehicleId}-${mileage}`,
    invoiceNumber: invoice++,
    customerId,
    vehicleId,
    customerName: customer.name,
    vehicleLabel: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
    mileage,
    lines: serviceNames.map(service),
    status: 'paid',
    bay: 1,
    paymentMethod,
    subtotal: total,
    tax: 0,
    taxRate: 0,
    total,
    createdAt: paidAt,
    startedAt: paidAt,
    finishedAt: paidAt,
    paidAt,
  };
}

export const testHistory: Ticket[] = [
  paidTicket('cust-1', 'veh-1', getDateMonthsAgo(18), 28100, ['Full Synthetic Oil Change', 'Tire Rotation'], 94.48),
  paidTicket('cust-1', 'veh-1', getDateMonthsAgo(12), 37600, ['Full Synthetic Oil Change', 'Air Filter'], 99.48),
  paidTicket('cust-1', 'veh-1', getDateMonthsAgo(6), 48200, ['Full Synthetic Oil Change', 'Wiper Blades', 'Battery Test'], 99.48),
  paidTicket('cust-2', 'veh-2', getDateMonthsAgo(14), 61800, ['Synthetic Blend Oil Change', 'Cabin Air Filter'], 84.48),
  paidTicket('cust-2', 'veh-2', getDateMonthsAgo(7), 72400, ['Synthetic Blend Oil Change', 'Tire Rotation', 'Fluid Top-Off'], 74.48),
  paidTicket('cust-3', 'veh-3', getDateMonthsAgo(16), 18900, ['Full Synthetic Oil Change', 'Interior Vacuum'], 89.48),
  paidTicket('cust-3', 'veh-3', getDateMonthsAgo(8), 31500, ['Full Synthetic Oil Change', 'Air Filter', 'Cabin Air Filter'], 129.47),
  paidTicket('cust-4', 'veh-4', getDateMonthsAgo(22), 83400, ['High-Mileage Oil Change', 'Transmission Flush', 'Coolant Flush'], 294.47),
  paidTicket('cust-4', 'veh-4', getDateMonthsAgo(10), 98700, ['High-Mileage Oil Change', 'Cabin Air Filter'], 94.48),
];

/** A memory store holding the test customers and their history (plus any extra tickets). */
export const createTestStore = (extraTickets: Ticket[] = []) =>
  createMemoryStore({ customers: testCustomers, tickets: [...testHistory, ...extraTickets] });
