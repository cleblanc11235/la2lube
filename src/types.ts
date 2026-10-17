export type AppScreen =
  | 'checkin'
  | 'services'
  | 'payment'
  | 'done'
  | 'bayboard'
  | 'reports'
  | 'guide';

export interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  engine: string;         // e.g. "5.0L"; empty when unknown
  plate: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  vehicles: Vehicle[];
}

export interface Service {
  id: string;
  name: string;
  price: number;
  category: 'oilchange' | 'fluid' | 'addon';
  /** On the oil change line: the weight ("5W-30") and total quarts put in. */
  oilWeight?: string;
  quarts?: number;
}

export type PaymentMethod = 'cash' | 'card';

/**
 * waiting     — in a bay, not started
 * in_progress — being worked on (bay timer running)
 * ready       — work done, bay freed, waiting on the customer to pay
 * paid        — closed out; counts in reports and service history
 * void        — cancelled (customer left, entered by mistake)
 */
export type TicketStatus = 'waiting' | 'in_progress' | 'ready' | 'paid' | 'void';

/** One visit: the single record that the bay board, payment, history and reports all read. */
export interface Ticket {
  id: string;
  invoiceNumber: number | null;
  customerId: string;
  vehicleId: string;
  // Snapshots, so reports still read right if the customer record changes later.
  customerName: string;
  vehicleLabel: string;
  mileage: number;
  /** Services with the price charged at the time. */
  lines: Service[];
  status: TicketStatus;
  bay: number | null;
  paymentMethod: PaymentMethod | null;
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  createdAt: string;      // ISO timestamps
  startedAt: string | null;
  finishedAt: string | null;
  paidAt: string | null;
}
