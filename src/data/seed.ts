import { User, Product, Order } from '../types';

export const seedUsers: User[] = [
  {
    id: 'u1',
    username: 'admin',
    email: 'admin@watermarket.com',
    password: 'admin123',
    role: 'admin',
    phone: '09171234567',
    address: '123 Main St, Barangay 1',
    createdAt: '2024-01-01T08:00:00Z',
  },
  {
    id: 'u2',
    username: 'staff1',
    email: 'staff1@watermarket.com',
    password: 'staff123',
    role: 'staff',
    phone: '09181234567',
    address: '456 Second St, Barangay 2',
    createdAt: '2024-01-15T08:00:00Z',
  },

];

export const seedProducts: Product[] = [
  {
    id: 'p1',
    name: 'Purified Water',
    type: 'water',
    price: 30,
    stock: 500,
    unit: 'container',
    description: 'Refill of purified water',
    minStock: 50,
  },
];

// Empty — all real data comes from Aiven MySQL database
export const seedOrders: Order[] = [];
