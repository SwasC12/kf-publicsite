// Shared shapes for the `products` and `orders` Firestore collections.
// Keep these identical to the Oil Tracker admin app's copy.

export interface Product {
  id: string;
  name: string;
  description?: string;
  size?: string; // e.g. "50ml"
  price: number; // ZAR
  stockQty: number | null; // null = not tracked by quantity
  inStock: boolean; // available to buy
  active: boolean; // visible on the storefront
  imageUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  size?: string;
  price: number;
  qty: number;
}

export interface OrderCustomer {
  name: string;
  email: string;
  phone: string;
  note?: string;
}

export type OrderStatus = 'pending' | 'paid' | 'fulfilled' | 'cancelled';

export interface Order {
  id: string;
  reference: string; // e.g. "KF-7K3Q9"
  customer: OrderCustomer;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
}

export interface CartItem {
  productId: string;
  name: string;
  size?: string;
  price: number;
  imageUrl?: string;
  qty: number;
}
