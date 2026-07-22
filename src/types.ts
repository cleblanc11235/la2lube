export type AppScreen =
  | 'checkin'
  | 'services'
  | 'payment'
  | 'done'
  | 'bayboard'
  | 'reports'
  | 'guide';

export interface ServiceRecord {
  date: string;           // ISO date string
  mileage: number;
  services: string[];     // service names
  total: number;
}

export interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  engine: string;         // e.g. "5.0L"
  plate: string;
  serviceHistory: ServiceRecord[];
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
}

export type BayStatus = 'inprogress' | 'empty' | 'waiting';

export interface BayTicket {
  customerId: string;
  vehicleId: string;
  currentMileage: number;
  selectedServices: Service[];
}

export interface Bay {
  id: number;
  status: BayStatus;
  ticket?: BayTicket;
  startTime?: number;     // Date.now() timestamp
}

export interface Transaction {
  id: string;
  time: string;           // formatted time string
  customerName: string;
  vehicle: string;
  services: string[];
  paymentMethod: 'cash' | 'card';
  total: number;
}
