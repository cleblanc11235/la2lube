import type { SupabaseClient } from '@supabase/supabase-js';
import type { Customer, Service, Ticket, Vehicle } from '../../types';
import { BayTakenError, type NewCustomer, type NewTicket, type NewVehicle, type ShopStore, type TicketPatch } from './ShopStore';

// Table layout lives in supabase/schema.sql.

interface VehicleRow {
  id: string;
  year: number | null;
  make: string;
  model: string;
  engine: string;
  plate: string;
}

interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  vehicles: VehicleRow[];
}

interface TicketRow {
  id: string;
  invoice_number: number | null;
  customer_id: string;
  vehicle_id: string;
  customer_name: string;
  vehicle_label: string;
  mileage: number;
  lines: Service[];
  status: Ticket['status'];
  bay: number | null;
  payment_method: Ticket['paymentMethod'];
  subtotal: number | string;
  tax: number | string;
  tax_rate: number | string;
  total: number | string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  paid_at: string | null;
}

const VEHICLE_COLUMNS = 'id, year, make, model, engine, plate';
const CUSTOMER_COLUMNS = `id, name, phone, vehicles (${VEHICLE_COLUMNS})`;
const TICKET_COLUMNS =
  'id, invoice_number, customer_id, vehicle_id, customer_name, vehicle_label, mileage, lines, status, bay, ' +
  'payment_method, subtotal, tax, tax_rate, total, created_at, started_at, finished_at, paid_at';

// Supabase caps a single response at 1,000 rows.
const PAGE_SIZE = 1000;

const toVehicle = (row: VehicleRow): Vehicle => ({
  id: row.id,
  year: row.year ?? 0,
  make: row.make,
  model: row.model,
  engine: row.engine,
  plate: row.plate,
});

const toCustomer = (row: CustomerRow): Customer => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  vehicles: (row.vehicles ?? []).map(toVehicle),
});

const toTicket = (row: TicketRow): Ticket => ({
  id: row.id,
  invoiceNumber: row.invoice_number,
  customerId: row.customer_id,
  vehicleId: row.vehicle_id,
  customerName: row.customer_name,
  vehicleLabel: row.vehicle_label,
  mileage: row.mileage,
  lines: row.lines ?? [],
  status: row.status,
  bay: row.bay,
  paymentMethod: row.payment_method,
  // numeric columns can come back as strings
  subtotal: Number(row.subtotal),
  tax: Number(row.tax),
  taxRate: Number(row.tax_rate),
  total: Number(row.total),
  createdAt: row.created_at,
  startedAt: row.started_at,
  finishedAt: row.finished_at,
  paidAt: row.paid_at,
});

const vehicleRow = (v: NewVehicle) => ({
  year: v.year || null,
  make: v.make,
  model: v.model,
  engine: v.engine,
  plate: v.plate,
});

const PATCH_COLUMNS: Record<keyof TicketPatch, string> = {
  lines: 'lines',
  status: 'status',
  bay: 'bay',
  paymentMethod: 'payment_method',
  subtotal: 'subtotal',
  tax: 'tax',
  taxRate: 'tax_rate',
  total: 'total',
  startedAt: 'started_at',
  finishedAt: 'finished_at',
  paidAt: 'paid_at',
  voidedAt: 'voided_at',
};

function fail(error: { message: string }): never {
  throw new Error(error.message);
}

export function createSupabaseStore(client: SupabaseClient): ShopStore {
  return {
    persistent: true,

    async listCustomers() {
      const all: Customer[] = [];
      for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await client
          .from('customers')
          .select(CUSTOMER_COLUMNS)
          .order('created_at', { ascending: false })
          .order('id')
          .range(from, from + PAGE_SIZE - 1);
        if (error) fail(error);
        all.push(...(data as unknown as CustomerRow[]).map(toCustomer));
        if (data.length < PAGE_SIZE) return all;
      }
    },

    async createCustomer(input: NewCustomer) {
      const { data: customer, error } = await client
        .from('customers')
        .insert({ name: input.name, phone: input.phone })
        .select('id, name, phone')
        .single();
      if (error) fail(error);

      const { data: vehicle, error: vehicleError } = await client
        .from('vehicles')
        .insert({ customer_id: customer.id, ...vehicleRow(input.vehicle) })
        .select(VEHICLE_COLUMNS)
        .single();
      if (vehicleError) fail(vehicleError);

      return { ...customer, vehicles: [toVehicle(vehicle as VehicleRow)] };
    },

    async addVehicle(customerId: string, input: NewVehicle) {
      const { data, error } = await client
        .from('vehicles')
        .insert({ customer_id: customerId, ...vehicleRow(input) })
        .select(VEHICLE_COLUMNS)
        .single();
      if (error) fail(error);
      return toVehicle(data as VehicleRow);
    },

    async getVehicleHistory(vehicleId: string) {
      const { data, error } = await client
        .from('tickets')
        .select(TICKET_COLUMNS)
        .eq('vehicle_id', vehicleId)
        .eq('status', 'paid')
        .order('paid_at', { ascending: false });
      if (error) fail(error);
      return (data as unknown as TicketRow[]).map(toTicket);
    },

    async listOpenTickets() {
      const { data, error } = await client
        .from('tickets')
        .select(TICKET_COLUMNS)
        .in('status', ['waiting', 'in_progress', 'ready'])
        .order('created_at');
      if (error) fail(error);
      return (data as unknown as TicketRow[]).map(toTicket);
    },

    async listPaidTickets(from: Date, to: Date) {
      const { data, error } = await client
        .from('tickets')
        .select(TICKET_COLUMNS)
        .eq('status', 'paid')
        .eq('source', 'app')
        .gte('paid_at', from.toISOString())
        .lt('paid_at', to.toISOString())
        .order('paid_at');
      if (error) fail(error);
      return (data as unknown as TicketRow[]).map(toTicket);
    },

    async createTicket(input: NewTicket) {
      const { data, error } = await client
        .from('tickets')
        .insert({
          customer_id: input.customerId,
          vehicle_id: input.vehicleId,
          customer_name: input.customerName,
          vehicle_label: input.vehicleLabel,
          mileage: input.mileage,
          lines: input.lines,
          bay: input.bay,
          status: 'waiting',
        })
        .select(TICKET_COLUMNS)
        .single();
      if (error) {
        // 23505 = unique violation on tickets_one_car_per_bay
        if (error.code === '23505' && input.bay != null) throw new BayTakenError(input.bay);
        fail(error);
      }
      return toTicket(data as unknown as TicketRow);
    },

    async updateTicket(id: string, patch: TicketPatch) {
      const row: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(patch)) {
        row[PATCH_COLUMNS[key as keyof TicketPatch]] = value;
      }
      const { data, error } = await client
        .from('tickets')
        .update(row)
        .eq('id', id)
        .select(TICKET_COLUMNS)
        .single();
      if (error) fail(error);
      return toTicket(data as unknown as TicketRow);
    },
  };
}
