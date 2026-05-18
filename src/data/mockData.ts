import type { Customer, Service, Bay } from '../types';

// Helper to get date N months ago
const getDateMonthsAgo = (months: number): string => {
  const date = new Date('2026-03-24');
  date.setMonth(date.getMonth() - months);
  return date.toISOString();
};

export const mockCustomers: Customer[] = [
  {
    id: 'cust-1',
    name: 'Mike Johnson',
    phone: '(318) 555-1234',
    vehicles: [
      {
        id: 'veh-1',
        year: 2021,
        make: 'Ford',
        model: 'F-150',
        engine: '5.0L',
        plate: 'LSU 4477',
        serviceHistory: [
          {
            date: getDateMonthsAgo(18),
            mileage: 28100,
            services: ['Full Synthetic Oil Change', 'Tire Rotation'],
            total: 94.48,
          },
          {
            date: getDateMonthsAgo(12),
            mileage: 37600,
            services: ['Full Synthetic Oil Change', 'Air Filter'],
            total: 99.48,
          },
          {
            date: getDateMonthsAgo(6),
            mileage: 48200,
            services: ['Full Synthetic Oil Change', 'Wiper Blades', 'Battery Test'],
            total: 99.48,
          },
        ],
      },
    ],
  },
  {
    id: 'cust-2',
    name: 'Sandra Lee',
    phone: '(318) 555-9876',
    vehicles: [
      {
        id: 'veh-2',
        year: 2018,
        make: 'Chevy',
        model: 'Silverado',
        engine: '5.3L',
        plate: 'RED 1122',
        serviceHistory: [
          {
            date: getDateMonthsAgo(14),
            mileage: 61800,
            services: ['Synthetic Blend Oil Change', 'Cabin Air Filter'],
            total: 84.48,
          },
          {
            date: getDateMonthsAgo(7),
            mileage: 72400,
            services: ['Synthetic Blend Oil Change', 'Tire Rotation', 'Fluid Top-Off'],
            total: 74.48,
          },
        ],
      },
    ],
  },
  {
    id: 'cust-3',
    name: 'Robert Williams',
    phone: '(318) 555-4422',
    vehicles: [
      {
        id: 'veh-3',
        year: 2020,
        make: 'Toyota',
        model: 'Camry',
        engine: '2.5L',
        plate: 'CAM 7890',
        serviceHistory: [
          {
            date: getDateMonthsAgo(16),
            mileage: 18900,
            services: ['Full Synthetic Oil Change', 'Interior Vacuum'],
            total: 89.48,
          },
          {
            date: getDateMonthsAgo(8),
            mileage: 31500,
            services: ['Full Synthetic Oil Change', 'Air Filter', 'Cabin Air Filter'],
            total: 129.47,
          },
        ],
      },
    ],
  },
  {
    id: 'cust-4',
    name: 'Debra Fontenot',
    phone: '(318) 555-7711',
    vehicles: [
      {
        id: 'veh-4',
        year: 2015,
        make: 'Honda',
        model: 'Civic',
        engine: '1.8L',
        plate: 'HON 2233',
        serviceHistory: [
          {
            date: getDateMonthsAgo(22),
            mileage: 83400,
            services: ['High-Mileage Oil Change', 'Transmission Flush', 'Coolant Flush'],
            total: 294.47,
          },
          {
            date: getDateMonthsAgo(10),
            mileage: 98700,
            services: ['High-Mileage Oil Change', 'Cabin Air Filter'],
            total: 94.48,
          },
        ],
      },
    ],
  },
];

export const serviceMenu: Service[] = [
  // Oil Changes
  { id: 'oil-conventional', name: 'Conventional Oil Change', price: 34.99, category: 'oilchange' },
  { id: 'oil-blend', name: 'Synthetic Blend Oil Change', price: 54.99, category: 'oilchange' },
  { id: 'oil-synthetic', name: 'Full Synthetic Oil Change', price: 74.99, category: 'oilchange' },
  { id: 'oil-highmileage', name: 'High-Mileage Oil Change', price: 64.99, category: 'oilchange' },
  { id: 'oil-diesel', name: 'Diesel Oil Change', price: 79.99, category: 'oilchange' },
  { id: 'oil-european', name: 'European Spec Oil Change', price: 84.99, category: 'oilchange' },

  // Fluids
  { id: 'fluid-transmission', name: 'Transmission Flush', price: 129.99, category: 'fluid' },
  { id: 'fluid-coolant', name: 'Coolant Flush', price: 99.99, category: 'fluid' },
  { id: 'fluid-power', name: 'Power Steering Flush', price: 79.99, category: 'fluid' },
  { id: 'fluid-brake', name: 'Brake Fluid Exchange', price: 69.99, category: 'fluid' },
  { id: 'fluid-differential', name: 'Differential Service', price: 89.99, category: 'fluid' },
  { id: 'fluid-ac', name: 'A/C Recharge', price: 119.99, category: 'fluid' },

  // Add-ons
  { id: 'addon-air', name: 'Air Filter', price: 24.99, category: 'addon' },
  { id: 'addon-cabin', name: 'Cabin Air Filter', price: 29.99, category: 'addon' },
  { id: 'addon-wipers', name: 'Wiper Blades', price: 24.99, category: 'addon' },
  { id: 'addon-rotation', name: 'Tire Rotation', price: 19.99, category: 'addon' },
  { id: 'addon-vacuum', name: 'Interior Vacuum', price: 14.99, category: 'addon' },
  { id: 'addon-battery', name: 'Battery Test', price: 0.00, category: 'addon' },
  { id: 'addon-topoff', name: 'Fluid Top-Off', price: 0.00, category: 'addon' },
];

export const mockBays: Bay[] = [
  {
    id: 1,
    status: 'inprogress',
    customerName: 'Mike Johnson',
    vehicle: '2021 Ford F-150',
    service: 'Full Synthetic Oil Change',
    startTime: Date.now() - 8 * 60 * 1000, // 8 minutes ago
  },
  {
    id: 2,
    status: 'complete',
    customerName: 'Sandra Lee',
    vehicle: '2018 Chevy Silverado',
    service: 'Synthetic Blend Oil Change',
  },
  {
    id: 3,
    status: 'empty',
  },
  {
    id: 4,
    status: 'waiting',
    customerName: 'Robert Williams',
    vehicle: '2020 Toyota Camry',
    service: 'Full Synthetic Oil Change',
  },
];
