import type { Customer, Ticket, Vehicle } from '../../types';
import { BayTakenError, type NewCustomer, type NewTicket, type NewVehicle, type ShopStore, type TicketPatch } from './ShopStore';

const OPEN = new Set<Ticket['status']>(['waiting', 'in_progress', 'ready']);
const IN_BAY = new Set<Ticket['status']>(['waiting', 'in_progress']);

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

/**
 * Keeps everything in memory. Used by tests, and by local dev when no
 * Supabase project is configured. Nothing survives a page refresh.
 */
export function createMemoryStore(seed: { customers?: Customer[]; tickets?: Ticket[] } = {}): ShopStore {
  // Newest first, matching the Supabase store's order.
  let customers: Customer[] = clone(seed.customers ?? []);
  let tickets: Ticket[] = clone(seed.tickets ?? []);
  let nextId = 1;
  let nextInvoice = tickets.reduce((max, t) => Math.max(max, t.invoiceNumber ?? 0), 1000) + 1;
  const id = (prefix: string) => `${prefix}-${Date.now()}-${nextId++}`;

  return {
    persistent: false,

    async listCustomers() {
      return clone(customers);
    },

    async createCustomer(input: NewCustomer) {
      const customer: Customer = {
        id: id('cust'),
        name: input.name,
        phone: input.phone,
        vehicles: [{ id: id('veh'), ...input.vehicle }],
      };
      customers = [customer, ...customers];
      return clone(customer);
    },

    async addVehicle(customerId: string, input: NewVehicle) {
      const vehicle: Vehicle = { id: id('veh'), ...input };
      customers = customers.map((c) =>
        c.id === customerId ? { ...c, vehicles: [...c.vehicles, vehicle] } : c
      );
      return clone(vehicle);
    },

    async getVehicleHistory(vehicleId: string) {
      return clone(
        tickets
          .filter((t) => t.vehicleId === vehicleId && t.status === 'paid')
          .sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? ''))
      );
    },

    async listOpenTickets() {
      return clone(tickets.filter((t) => OPEN.has(t.status)));
    },

    async listPaidTickets(from: Date, to: Date) {
      const lo = from.getTime();
      const hi = to.getTime();
      return clone(
        tickets
          .filter((t) => {
            if (t.status !== 'paid' || !t.paidAt) return false;
            const at = new Date(t.paidAt).getTime();
            return at >= lo && at < hi;
          })
          .sort((a, b) => (a.paidAt ?? '').localeCompare(b.paidAt ?? ''))
      );
    },

    async createTicket(input: NewTicket) {
      if (input.bay != null && tickets.some((t) => t.bay === input.bay && IN_BAY.has(t.status))) {
        throw new BayTakenError(input.bay);
      }
      const ticket: Ticket = {
        ...input,
        id: id('tkt'),
        invoiceNumber: nextInvoice++,
        status: 'waiting',
        paymentMethod: null,
        subtotal: 0,
        tax: 0,
        taxRate: 0,
        total: 0,
        createdAt: new Date().toISOString(),
        startedAt: null,
        finishedAt: null,
        paidAt: null,
      };
      tickets = [...tickets, ticket];
      return clone(ticket);
    },

    async updateTicket(ticketId: string, patch: TicketPatch) {
      const existing = tickets.find((t) => t.id === ticketId);
      if (!existing) throw new Error('Ticket not found');
      // voidedAt is stored by the database only; the app never reads it back.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { voidedAt, ...rest } = patch;
      const updated: Ticket = { ...existing, ...rest };
      tickets = tickets.map((t) => (t.id === ticketId ? updated : t));
      return clone(updated);
    },
  };
}
