export function formatPrice(v: number | null | undefined): string {
  if (v == null) return '—';
  return 'R' + Number(v).toFixed(2).replace(/\.00$/, '');
}

import { Product, ProductSize, ProductSizeKey, PRODUCT_SIZE_KEYS } from '@core/models';

export interface SizeOption { key: ProductSizeKey; size: ProductSize; }

export function sizeOptions(p: Product): SizeOption[] {
  const out: SizeOption[] = [];
  if (p.sizes) {
    for (const key of PRODUCT_SIZE_KEYS) {
      const size = p.sizes[key];
      if (size && Number(size.price) > 0) out.push({ key, size });
    }
  }
  if (out.length) return out;
  if (Number(p.price) > 0) {
    out.push({
      key: 'size30',
      size: {
        size: p.size || 'Default',
        price: p.price,
        salePrice: p.salePrice,
        cost: p.cost,
        stockQty: p.stockQty,
        inStock: p.inStock,
        imageUrl: p.imageUrl,
      },
    });
  }
  return out;
}

export function sizeEffectivePrice(s: ProductSize): number {
  return s.salePrice != null && Number(s.salePrice) > 0 && Number(s.salePrice) < Number(s.price)
    ? Number(s.salePrice) : Number(s.price) || 0;
}

export function sizeOnSale(s: ProductSize): boolean {
  return s.salePrice != null && Number(s.salePrice) > 0 && Number(s.salePrice) < Number(s.price);
}

export function fromPrice(p: Product): number {
  const opts = sizeOptions(p);
  return opts.length ? Math.min(...opts.map((o) => sizeEffectivePrice(o.size))) : Number(p.price) || 0;
}

export function defaultSizeKey(p: Product): ProductSizeKey | undefined {
  return sizeOptions(p)[0]?.key;
}

export function sizeImage(p: Product, s: ProductSize): string {
  return optimizedImage(s.imageUrl || p.imageUrl, 900) || placeholderFor(p.gender);
}

export function sizeAvailable(s: ProductSize): boolean {
  return !!s.inStock && (s.stockQty == null || Number(s.stockQty) > 0);
}

export const SA_PROVINCES = [
  'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo',
  'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape',
];

/** South African mobile/landline: 0XXXXXXXXX or +27XXXXXXXXX. */
export function isValidPhone(v: string): boolean {
  const digits = v.replace(/[^\d+]/g, '');
  return /^(\+27|0)\d{9}$/.test(digits);
}

/** Basic e-mail validation — rejects obviously invalid addresses. */
export function isValidEmail(v: string): boolean {
  const s = v.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/**
 * Adds sensible delivery transforms to Cloudinary URLs (auto format, auto
 * quality, capped width). Only touches URLs that still have a version segment,
 * so already-transformed URLs are left alone.
 */
export function optimizedImage(url: string | undefined, width = 1200): string {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) return url || '';
  const parts = url.split('/image/upload/');
  if (parts.length !== 2) return url;
  const first = parts[1].split('/')[0];
  if (!/^v\d+$/.test(first)) return url;
  return parts[0] + '/image/upload/f_auto,q_auto,w_' + width + '/' + parts[1];
}

// Optional custom placeholders (data URLs) configured in the admin Image Manager.
// When set they override the bundled default bottles. Updated by SettingsService.
let customMen = '';
let customWomen = '';
export function setPlaceholderOverrides(men?: string, women?: string): void {
  customMen = men || '';
  customWomen = women || '';
}

/** Branded placeholder bottle by gender when a product has no image of its own. */
export function placeholderFor(gender?: string): string {
  const g = (gender || '').toLowerCase();
  const isWomen = g.startsWith('w') || g.includes('lad') || g.includes('her');
  if (isWomen) return customWomen || 'placeholder-women.jpg';
  return customMen || 'placeholder-men.jpg';
}

/** True for a usable custom image (not blank, not Rumi's generic cover). */
export function isCustomImage(url?: string): boolean {
  return !!url && !url.includes('rumifragrances.co.za');
}

/** The image to show for a product: its own, else the branded gender placeholder. */
export function productImage(p: { imageUrl?: string; gender?: string }): string {
  const url = isCustomImage(p.imageUrl) ? p.imageUrl! : placeholderFor(p.gender);
  return optimizedImage(url, 900);
}
