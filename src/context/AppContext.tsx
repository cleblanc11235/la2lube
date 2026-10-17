/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { AppScreen, Customer, Vehicle, Service, Ticket, PaymentMethod } from '../types';
import type { Recommendation } from '../data/recommendations';
import { serviceMenu } from '../config/serviceMenu';
import { TAX_RATE } from '../config/shopSettings';
import { ticketTotals } from '../data/money';
import { getDefaultStore, type NewCustomer, type NewVehicle, type ShopStore } from '../data/store';

/** The ticket being built or paid at the counter. Not saved until it's sent to a bay. */
interface DraftTicket {
  /** Set once the ticket is saved (it's in a bay or ready to pay). */
  ticketId: string | null;
  customerId: string | null;
  vehicleId: string | null;
  currentMileage: number | null;
  selectedServices: Service[];
  recommendations: Recommendation[];
}

interface AppState {
  /** False when running on the in-memory store: nothing is being saved. */
  persistent: boolean;
  /** Set when the last load or save failed (e.g. the internet dropped). */
  syncError: string | null;

  // Navigation
  activeScreen: AppScreen;
  setScreen: (s: AppScreen) => void;

  // Counter ticket
  ticket: DraftTicket;
  setTicket: (t: Partial<DraftTicket>) => void;
  resetTicket: () => void;

  // Customers
  customers: Customer[];
  customersLoaded: boolean;
  getCustomerById: (id: string) => Customer | undefined;
  getVehicleById: (customerId: string, vehicleId: string) => Vehicle | undefined;
  addCustomer: (c: NewCustomer) => Promise<Customer>;
  addVehicle: (customerId: string, v: NewVehicle) => Promise<Vehicle>;
  getVehicleHistory: (vehicleId: string) => Promise<Ticket[]>;

  // Tickets
  /** In a bay or ready to pay. */
  openTickets: Ticket[];
  sendTicketToBay: (bay: number) => Promise<void>;
  startJob: (ticketId: string) => Promise<void>;
  finishJob: (ticketId: string) => Promise<void>;
  voidTicket: (ticketId: string) => Promise<void>;
  openForPayment: (ticket: Ticket) => Promise<void>;
  /** Save service changes made from the Payment screen, then return to it. */
  saveTicketLines: () => Promise<void>;
  completePayment: (method: PaymentMethod) => Promise<void>;
  /** The ticket just paid, for the Done screen. */
  lastPaidTicket: Ticket | null;

  // Reports
  todaysPaidTickets: Ticket[];
  totalRevenue: number;
  carCount: number;
  loadPaidTickets: (day: Date) => Promise<Ticket[]>;

  // Service menu
  services: Service[];
}

const AppContext = createContext<AppState | undefined>(undefined);

const initialTicket: DraftTicket = {
  ticketId: null,
  customerId: null,
  vehicleId: null,
  currentMileage: null,
  selectedServices: [],
  recommendations: [],
};

const POLL_MS = 15_000;
const CUSTOMER_REFRESH_MS = 60_000;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const nextDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

/** "2021 Ford F-150", or just the plate when that's all we have. */
export const vehicleLabel = (v: Vehicle) =>
  [v.year || '', v.make, v.model].join(' ').trim() || v.plate || 'Vehicle';

/** Customers checked in by plate alone have no name yet. */
export const customerLabel = (c: Pick<Customer, 'name'>) => c.name.trim() || 'No name on file';

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

interface AppProviderProps {
  children: React.ReactNode;
  /** Where data lives. Defaults to Supabase when configured; tests pass a memory store. */
  store?: ShopStore;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children, store: storeProp }) => {
  const store = useMemo(() => storeProp ?? getDefaultStore(), [storeProp]);

  const [activeScreen, setActiveScreen] = useState<AppScreen>('checkin');
  const [ticket, setTicketState] = useState<DraftTicket>(initialTicket);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoaded, setCustomersLoaded] = useState(false);
  const [openTickets, setOpenTickets] = useState<Ticket[]>([]);
  const [todaysPaidTickets, setTodaysPaidTickets] = useState<Ticket[]>([]);
  const [lastPaidTicket, setLastPaidTicket] = useState<Ticket | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const mounted = useRef(true);
  const customersFetchedAt = useRef(0);
  // Bumped on every local ticket change. A poll that started before the change
  // would carry stale data, so its result is dropped.
  const ticketWrites = useRef(0);

  // --- Loading ---------------------------------------------------------------

  const refreshCustomers = useCallback(async () => {
    customersFetchedAt.current = Date.now();
    try {
      const list = await store.listCustomers();
      if (!mounted.current) return;
      setCustomers(list);
      setCustomersLoaded(true);
    } catch (e) {
      if (mounted.current) setSyncError(`Couldn't load customers: ${message(e)}`);
    }
  }, [store]);

  const refreshTickets = useCallback(async () => {
    const writesAtStart = ticketWrites.current;
    try {
      const now = new Date();
      const [open, paid] = await Promise.all([
        store.listOpenTickets(),
        store.listPaidTickets(startOfDay(now), nextDay(now)),
      ]);
      if (!mounted.current || ticketWrites.current !== writesAtStart) return;
      setOpenTickets(open);
      setTodaysPaidTickets(paid);
      setSyncError(null);
    } catch (e) {
      if (mounted.current) setSyncError(`Couldn't reach the database: ${message(e)}`);
    }
  }, [store]);

  useEffect(() => {
    mounted.current = true;
    refreshCustomers();
    refreshTickets();

    // Other devices (the shop iPhone) change tickets too. Poll, and refresh as
    // soon as someone comes back to this window — e.g. alt-tabbing from DataLube.
    const poll = setInterval(refreshTickets, POLL_MS);
    const onReturn = () => {
      if (document.visibilityState === 'hidden') return;
      refreshTickets();
      if (Date.now() - customersFetchedAt.current > CUSTOMER_REFRESH_MS) refreshCustomers();
    };
    window.addEventListener('focus', onReturn);
    document.addEventListener('visibilitychange', onReturn);

    return () => {
      mounted.current = false;
      clearInterval(poll);
      window.removeEventListener('focus', onReturn);
      document.removeEventListener('visibilitychange', onReturn);
    };
  }, [refreshCustomers, refreshTickets]);

  // --- Counter ticket ---------------------------------------------------------

  const setTicket = useCallback((partial: Partial<DraftTicket>) => {
    setTicketState((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetTicket = useCallback(() => {
    setTicketState(initialTicket);
  }, []);

  const setScreen = useCallback((s: AppScreen) => {
    setActiveScreen(s);
  }, []);

  // --- Customers --------------------------------------------------------------

  const getCustomerById = useCallback(
    (id: string) => customers.find((c) => c.id === id),
    [customers]
  );

  const getVehicleById = useCallback(
    (customerId: string, vehicleId: string) =>
      getCustomerById(customerId)?.vehicles.find((v) => v.id === vehicleId),
    [getCustomerById]
  );

  const addCustomer = useCallback(
    async (input: NewCustomer) => {
      const created = await store.createCustomer(input);
      setCustomers((prev) => [created, ...prev]);
      return created;
    },
    [store]
  );

  const addVehicle = useCallback(
    async (customerId: string, input: NewVehicle) => {
      const created = await store.addVehicle(customerId, input);
      setCustomers((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, vehicles: [...c.vehicles, created] } : c))
      );
      return created;
    },
    [store]
  );

  const getVehicleHistory = useCallback((vehicleId: string) => store.getVehicleHistory(vehicleId), [store]);

  // --- Tickets ----------------------------------------------------------------

  const replaceOpenTicket = useCallback((updated: Ticket) => {
    ticketWrites.current++;
    setOpenTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }, []);

  const sendTicketToBay = useCallback(
    async (bay: number) => {
      const { customerId, vehicleId, currentMileage, selectedServices } = ticket;
      if (!customerId || !vehicleId || currentMileage == null || selectedServices.length === 0) return;
      const customer = getCustomerById(customerId);
      const vehicle = getVehicleById(customerId, vehicleId);
      if (!customer || !vehicle) return;

      try {
        ticketWrites.current++;
        const created = await store.createTicket({
          customerId,
          vehicleId,
          customerName: customerLabel(customer),
          vehicleLabel: vehicleLabel(vehicle),
          mileage: currentMileage,
          lines: selectedServices,
          bay,
        });
        setOpenTickets((prev) => [...prev, created]);
        setTicketState(initialTicket);
        setActiveScreen('bayboard');
      } catch (e) {
        // Most likely another device took the bay; show the real bay state.
        refreshTickets();
        throw e;
      }
    },
    [store, ticket, getCustomerById, getVehicleById, refreshTickets]
  );

  const startJob = useCallback(
    async (ticketId: string) => {
      replaceOpenTicket(
        await store.updateTicket(ticketId, { status: 'in_progress', startedAt: new Date().toISOString() })
      );
    },
    [store, replaceOpenTicket]
  );

  const finishJob = useCallback(
    async (ticketId: string) => {
      replaceOpenTicket(
        await store.updateTicket(ticketId, { status: 'ready', finishedAt: new Date().toISOString() })
      );
    },
    [store, replaceOpenTicket]
  );

  const voidTicket = useCallback(
    async (ticketId: string) => {
      await store.updateTicket(ticketId, { status: 'void', voidedAt: new Date().toISOString() });
      ticketWrites.current++;
      setOpenTickets((prev) => prev.filter((t) => t.id !== ticketId));
    },
    [store]
  );

  const openForPayment = useCallback(
    async (t: Ticket) => {
      // The ticket may be for a customer another device just added.
      if (!getCustomerById(t.customerId)) await refreshCustomers();
      setTicketState({
        ticketId: t.id,
        customerId: t.customerId,
        vehicleId: t.vehicleId,
        currentMileage: t.mileage,
        selectedServices: t.lines,
        recommendations: [],
      });
      setActiveScreen('payment');
    },
    [getCustomerById, refreshCustomers]
  );

  const saveTicketLines = useCallback(async () => {
    if (!ticket.ticketId) return;
    replaceOpenTicket(await store.updateTicket(ticket.ticketId, { lines: ticket.selectedServices }));
    setActiveScreen('payment');
  }, [store, ticket, replaceOpenTicket]);

  const completePayment = useCallback(
    async (method: PaymentMethod) => {
      if (!ticket.ticketId) return;
      const { subtotal, tax, total } = ticketTotals(ticket.selectedServices, TAX_RATE);
      const paid = await store.updateTicket(ticket.ticketId, {
        status: 'paid',
        lines: ticket.selectedServices,
        paymentMethod: method,
        subtotal,
        tax,
        taxRate: TAX_RATE,
        total,
        paidAt: new Date().toISOString(),
      });
      ticketWrites.current++;
      setOpenTickets((prev) => prev.filter((t) => t.id !== paid.id));
      setTodaysPaidTickets((prev) => [...prev.filter((t) => t.id !== paid.id), paid]);
      setLastPaidTicket(paid);
      setActiveScreen('done');
    },
    [store, ticket]
  );

  // --- Reports ----------------------------------------------------------------

  const loadPaidTickets = useCallback(
    (day: Date) => store.listPaidTickets(startOfDay(day), nextDay(day)),
    [store]
  );

  const totalRevenue = useMemo(
    () => todaysPaidTickets.reduce((sum, t) => sum + t.total, 0),
    [todaysPaidTickets]
  );
  const carCount = todaysPaidTickets.length;

  const value: AppState = {
    persistent: store.persistent,
    syncError,
    activeScreen,
    setScreen,
    ticket,
    setTicket,
    resetTicket,
    customers,
    customersLoaded,
    getCustomerById,
    getVehicleById,
    addCustomer,
    addVehicle,
    getVehicleHistory,
    openTickets,
    sendTicketToBay,
    startJob,
    finishJob,
    voidTicket,
    openForPayment,
    saveTicketLines,
    completePayment,
    lastPaidTicket,
    todaysPaidTickets,
    totalRevenue,
    carCount,
    loadPaidTickets,
    services: serviceMenu,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppState => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
