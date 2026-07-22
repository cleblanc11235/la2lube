/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import type { AppScreen, Customer, Vehicle, Service, Bay, Transaction, ServiceRecord } from '../types';
import type { Recommendation } from '../data/recommendations';
import { mockCustomers, serviceMenu, mockBays } from '../data/mockData';

interface Ticket {
  customerId: string | null;
  vehicleId: string | null;
  currentMileage: number | null;
  selectedServices: Service[];
  recommendations: Recommendation[];
}

interface AppState {
  // Navigation
  activeScreen: AppScreen;
  setScreen: (s: AppScreen) => void;

  // Current ticket being built
  ticket: Ticket;
  setTicket: (t: Partial<Ticket>) => void;
  resetTicket: () => void;

  // Completed transactions
  transactions: Transaction[];
  addTransaction: (t: Transaction) => void;

  // Derived stats (computed from transactions)
  totalRevenue: number;
  carCount: number;

  // Bays
  bays: Bay[];
  sendTicketToBay: (bayId: number) => void;
  advanceBay: (id: number) => void;

  // Customers
  customers: Customer[];
  getCustomerById: (id: string) => Customer | undefined;
  getVehicleById: (customerId: string, vehicleId: string) => Vehicle | undefined;
  addCustomer: (c: Customer) => void;
  addServiceRecord: (customerId: string, vehicleId: string, record: ServiceRecord) => void;

  // Service menu
  services: Service[];
}

const AppContext = createContext<AppState | undefined>(undefined);

const initialTicket: Ticket = {
  customerId: null,
  vehicleId: null,
  currentMileage: null,
  selectedServices: [],
  recommendations: [],
};

// Pre-populate with 3 completed transactions from earlier today
const getInitialTransactions = (): Transaction[] => {
  const today = new Date();
  const formatTime = (hoursAgo: number) => {
    const time = new Date(today);
    time.setHours(today.getHours() - hoursAgo);
    return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return [
    {
      id: 'trans-1',
      time: formatTime(4),
      customerName: 'James Martin',
      vehicle: '2019 Honda Accord',
      services: ['Full Synthetic Oil Change', 'Tire Rotation'],
      paymentMethod: 'card',
      total: 94.48,
    },
    {
      id: 'trans-2',
      time: formatTime(3),
      customerName: 'Mary Thompson',
      vehicle: '2022 Toyota RAV4',
      services: ['Synthetic Blend Oil Change', 'Cabin Air Filter', 'Wiper Blades'],
      paymentMethod: 'cash',
      total: 109.47,
    },
    {
      id: 'trans-3',
      time: formatTime(1),
      customerName: 'David Brown',
      vehicle: '2017 Ford Escape',
      services: ['High-Mileage Oil Change', 'Air Filter', 'Battery Test'],
      paymentMethod: 'card',
      total: 89.48,
    },
  ];
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeScreen, setActiveScreen] = useState<AppScreen>('checkin');
  const [ticket, setTicketState] = useState<Ticket>(initialTicket);
  const [transactions, setTransactions] = useState<Transaction[]>(getInitialTransactions());
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [bays, setBays] = useState<Bay[]>(mockBays);

  const setTicket = useCallback((partial: Partial<Ticket>) => {
    setTicketState((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetTicket = useCallback(() => {
    setTicketState(initialTicket);
  }, []);

  const addTransaction = useCallback((t: Transaction) => {
    setTransactions((prev) => [...prev, t]);
  }, []);

  const setScreen = useCallback((s: AppScreen) => {
    setActiveScreen(s);
  }, []);

  // Derived stats
  const totalRevenue = useMemo(
    () => transactions.reduce((sum, t) => sum + t.total, 0),
    [transactions]
  );

  const carCount = useMemo(() => transactions.length, [transactions]);

  const addCustomer = useCallback((c: Customer) => {
    setCustomers((prev) => [...prev, c]);
  }, []);

  const addServiceRecord = useCallback(
    (customerId: string, vehicleId: string, record: ServiceRecord) => {
      setCustomers((prev) =>
        prev.map((customer) =>
          customer.id !== customerId
            ? customer
            : {
                ...customer,
                vehicles: customer.vehicles.map((vehicle) =>
                  vehicle.id !== vehicleId
                    ? vehicle
                    : { ...vehicle, serviceHistory: [...vehicle.serviceHistory, record] }
                ),
              }
        )
      );
    },
    []
  );

  // Send the ticket currently being built at the counter to an open bay,
  // then clear the counter so the next customer can be checked in.
  const sendTicketToBay = useCallback(
    (bayId: number) => {
      if (!ticket.customerId || !ticket.vehicleId || !ticket.currentMileage || ticket.selectedServices.length === 0) {
        return;
      }
      const bayTicket = {
        customerId: ticket.customerId,
        vehicleId: ticket.vehicleId,
        currentMileage: ticket.currentMileage,
        selectedServices: ticket.selectedServices,
      };
      setBays((prev) =>
        prev.map((bay) =>
          bay.id === bayId && bay.status === 'empty'
            ? { ...bay, status: 'waiting', ticket: bayTicket }
            : bay
        )
      );
      setTicketState(initialTicket);
      setActiveScreen('bayboard');
    },
    [ticket]
  );

  // waiting -> inprogress starts the timer. inprogress -> loads that bay's
  // ticket into the active ticket slot and jumps straight to Payment (the
  // car is leaving the bay while the customer pays at the counter), freeing
  // the bay immediately.
  const advanceBay = useCallback(
    (id: number) => {
      const bay = bays.find((b) => b.id === id);
      if (!bay) return;

      if (bay.status === 'waiting') {
        setBays((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status: 'inprogress', startTime: Date.now() } : b))
        );
        return;
      }

      if (bay.status === 'inprogress' && bay.ticket) {
        setTicketState({
          customerId: bay.ticket.customerId,
          vehicleId: bay.ticket.vehicleId,
          currentMileage: bay.ticket.currentMileage,
          selectedServices: bay.ticket.selectedServices,
          recommendations: [],
        });
        setBays((prev) => prev.map((b) => (b.id === id ? { id: b.id, status: 'empty' } : b)));
        setActiveScreen('payment');
      }
    },
    [bays]
  );

  // Lookup helpers
  const getCustomerById = useCallback((id: string): Customer | undefined => {
    return customers.find((c) => c.id === id);
  }, [customers]);

  const getVehicleById = useCallback((customerId: string, vehicleId: string): Vehicle | undefined => {
    const customer = getCustomerById(customerId);
    return customer?.vehicles.find((v) => v.id === vehicleId);
  }, [getCustomerById]);

  const value: AppState = {
    activeScreen,
    setScreen,
    ticket,
    setTicket,
    resetTicket,
    transactions,
    addTransaction,
    totalRevenue,
    carCount,
    bays,
    sendTicketToBay,
    advanceBay,
    customers,
    getCustomerById,
    getVehicleById,
    addCustomer,
    addServiceRecord,
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
