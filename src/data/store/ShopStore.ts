import type { Customer, Ticket, Vehicle } from '../../types';

export type NewVehicle = Omit<Vehicle, 'id'>;

export interface NewCustomer {
  name: string;
  phone: string;
  vehicle: NewVehicle;
}

export type NewTicket = Pick<
  Ticket,
  'customerId' | 'vehicleId' | 'customerName' | 'vehicleLabel' | 'mileage' | 'lines' | 'bay'
>;

export type TicketPatch = Partial<
  Pick<
    Ticket,
    | 'lines'
    | 'status'
    | 'bay'
    | 'paymentMethod'
    | 'subtotal'
    | 'tax'
    | 'taxRate'
    | 'total'
    | 'startedAt'
    | 'finishedAt'
    | 'paidAt'
  >
> & { voidedAt?: string };

/** Thrown by createTicket when another device put a car in that bay first. */
export class BayTakenError extends Error {
  constructor(bay: number) {
    super(`Bay ${bay} was just taken by another ticket.`);
    this.name = 'BayTakenError';
  }
}

/**
 * Everything the shop app reads and writes. The app talks only to this, so
 * the backing store (in-memory for tests and local dev, Supabase in the
 * shop) can change without touching screens.
 */
export interface ShopStore {
  /** False for the in-memory store: nothing survives a refresh. */
  readonly persistent: boolean;

  /** Every customer with their vehicles, newest customer first. */
  listCustomers(): Promise<Customer[]>;
  createCustomer(input: NewCustomer): Promise<Customer>;
  addVehicle(customerId: string, vehicle: NewVehicle): Promise<Vehicle>;

  /** Paid visits for one vehicle, newest first. */
  getVehicleHistory(vehicleId: string): Promise<Ticket[]>;
  /** Tickets not yet paid or voided: in a bay, or ready to pay. */
  listOpenTickets(): Promise<Ticket[]>;
  /** Paid tickets with paidAt in [from, to). */
  listPaidTickets(from: Date, to: Date): Promise<Ticket[]>;

  createTicket(input: NewTicket): Promise<Ticket>;
  updateTicket(id: string, patch: TicketPatch): Promise<Ticket>;
}
