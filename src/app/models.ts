// Shared shapes for the Kauā Fragrances shop. Keep in sync with the Oil Tracker admin.

export interface Product {
  id: string;
  name: string;
  description?: string;
  size?: string; // e.g. "50ml"
  price: number; // ZAR
  salePrice?: number | null; // if set and < price, shown as a sale
  stockQty: number | null;
  inStock: boolean;
  active: boolean;
  imageUrl?: string;
  gallery?: string[]; // extra image URLs
  category?: string; // e.g. "Men", "Women", "Unisex", "Oud"
  gender?: string; // Men | Women | Unisex
  inspiredBy?: string; // "smells like" — e.g. "Tom Ford Oud Wood"
  notesTop?: string;
  notesHeart?: string;
  notesBase?: string;
  longDescription?: string;
  featured?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

export function emptyAddress(): Address {
  return { line1: '', line2: '', city: '', province: '', postalCode: '', country: 'South Africa' };
}

export interface CustomerProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  billing: Address;
  delivery: Address;
  updatedAt: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  size?: string;
  price: number;
  qty: number;
}

export interface OrderContact {
  name: string;
  email: string;
  phone: string;
  note?: string;
}

export type OrderStatus = 'pending' | 'paid' | 'fulfilled' | 'cancelled';

export type DeliveryMethod = 'delivery' | 'collection';

export interface Order {
  id: string;
  reference: string;
  uid?: string | null; // set when placed by a signed-in customer
  customer: OrderContact;
  delivery: Address;
  deliveryMethod?: DeliveryMethod;
  deliveryFee?: number;
  subtotal?: number;
  discountCode?: string;
  discountAmount?: number;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
}

export type DiscountMechanic = 'order' | 'item' | 'bundle';
export type BundleReward = 'percent' | 'fixed' | 'price' | 'free';

export interface Discount {
  code: string;
  type: 'percent' | 'fixed'; // used by 'order' and 'item' mechanics
  value: number;             // percent (0–100) or rand amount
  active: boolean;
  scope?: 'online' | 'pos' | 'both';
  minSpend?: number;
  maxUses?: number | null;
  usedCount?: number;
  expiresAt?: number | null;
  // How the discount works. Defaults to 'order' for older codes.
  mechanic?: DiscountMechanic;
  // Multi-buy / bundle ("take N") settings.
  bundleQty?: number;          // group size N
  bundleReward?: BundleReward; // how each complete group is rewarded
  bundleValue?: number;        // % off group / R off group / group price
  bundleFree?: number;         // # cheapest items free per group (reward 'free')
}

export interface RestockRequest {
  id: string;
  productId: string;
  productName: string;
  email: string;
  createdAt: number;
  notified: boolean;
}

export interface StoreSettings {
  storeOpen?: boolean;
  storeClosedMessage?: string;
  deliveryEnabled?: boolean;
  collectionEnabled?: boolean;
  deliveryFee?: number;
  freeDeliveryThreshold?: number | null; // subtotal >= this ships free
  collectionNote?: string;
  whatsappNumber?: string; // international, digits only, e.g. 27821234567
  contactEmail?: string;
  contactPhone?: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankBranchCode?: string;
  bankAccountType?: string;
  // Custom placeholder images (data URLs) set from the admin Image Manager.
  placeholderMen?: string;
  placeholderWomen?: string;
  updatedAt?: number;
}

export interface CartItem {
  productId: string;
  name: string;
  size?: string;
  price: number; // effective price (sale if applicable)
  imageUrl?: string;
  qty: number;
}

// ---- CMS / editable site content ----
export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  active: boolean;
}

export interface SiteContent {
  announcementText?: string;
  announcementActive?: boolean;
  heroTitle?: string;
  heroSubtitle?: string;
  heroImageUrl?: string;
  heroCtaText?: string;
  heroCtaLink?: string;
  banners?: Banner[];
  featuredTitle?: string;
  updatedAt?: number;
}

/** The effective selling price (sale price if valid, else price). */
export function effectivePrice(p: Product): number {
  return p.salePrice != null && p.salePrice > 0 && p.salePrice < p.price ? p.salePrice : p.price;
}

export function isOnSale(p: Product): boolean {
  return p.salePrice != null && p.salePrice > 0 && p.salePrice < p.price;
}
