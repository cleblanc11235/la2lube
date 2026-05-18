/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useMemo } from 'react';
import type { AppScreen, Customer, Vehicle, Service, Bay, Transaction } from '../types';
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

  // Bays (static mock data, no mutations needed for demo)
  bays: Bay[];

  // Lookup helpers
  getCustomerById: (id: string) => Customer | undefined;
  getVehicleById: (customerId: string, vehicleId: string) => Vehicle | undefined;
  addTempCustomer: (c: Customer) => void;

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
  const [tempCustomers, setTempCustomers] = useState<Customer[]>([]);

  const setTicket = (partial: Partial<Ticket>) => {
    setTicketState((prev) => ({ ...prev, ...partial }));
  };

  const resetTicket = () => {
    setTicketState(initialTicket);
  };

  const addTransaction = (t: Transaction) => {
    setTransactions((prev) => [...prev, t]);
  };

  const setScreen = (s: AppScreen) => {
    setActiveScreen(s);
  };

  // Derived stats
  const totalRevenue = useMemo(
    () => transactions.reduce((sum, t) => sum + t.total, 0),
    [transactions]
  );

  const carCount = useMemo(() => transactions.length, [transactions]);

  const addTempCustomer = (c: Customer) => {
    setTempCustomers((prev) => [...prev, c]);
  };

  // Lookup helpers
  const getCustomerById = (id: string): Customer | undefined => {
    return mockCustomers.find((c) => c.id === id) ?? tempCustomers.find((c) => c.id === id);
  };

  const getVehicleById = (customerId: string, vehicleId: string): Vehicle | undefined => {
    const customer = getCustomerById(customerId);
    return customer?.vehicles.find((v) => v.id === vehicleId);
  };

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
    bays: mockBays,
    getCustomerById,
    getVehicleById,
    addTempCustomer,
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
