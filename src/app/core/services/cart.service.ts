import { Injectable, computed, effect, signal } from '@angular/core';
import { CartItem, Product, ProductSizeKey, effectivePrice } from '@core/models';
import { productImage, sizeEffectivePrice, sizeImage, sizeOptions } from '@core/utils';

const KEY = 'kf.cart.v1';

@Injectable({ providedIn: 'root' })
export class CartService {
  readonly items = signal<CartItem[]>(this.read());

  readonly count = computed(() => this.items().reduce((n, i) => n + i.qty, 0));
  readonly total = computed(() => this.items().reduce((n, i) => n + i.price * i.qty, 0));
  /** Signals the most recently added product (for the "added to cart" toast). */
  readonly lastAdd = signal<{ name: string; at: number } | null>(null);

  qtyOf(productId: string, sizeKey?: ProductSizeKey): number {
    return this.items().find((i) => i.productId === productId && (i.sizeKey || undefined) === (sizeKey || undefined))?.qty ?? 0;
  }

  constructor() {
    effect(() => this.write(this.items()));
  }

  add(p: Product, qty = 1, sizeKey?: ProductSizeKey): void {
    const opts = sizeOptions(p);
    const chosen = opts.find((o) => o.key === sizeKey) || opts[0];
    const key = chosen?.key;
    const size = chosen?.size.size || p.size;
    const price = chosen ? sizeEffectivePrice(chosen.size) : effectivePrice(p);
    const imageUrl = chosen ? sizeImage(p, chosen.size) : productImage(p);
    this.items.update((list) => {
      const existing = list.find((i) => i.productId === p.id && (i.sizeKey || undefined) === (key || undefined));
      if (existing) {
        return list.map((i) =>
          i === existing ? { ...i, qty: i.qty + qty } : i,
        );
      }
      return [
        ...list,
        { productId: p.id, sizeKey: key, name: p.name, size, price, imageUrl, qty },
      ];
    });
    this.lastAdd.set({ name: p.name, at: Date.now() });
  }

  setQty(productId: string, qty: number, sizeKey?: ProductSizeKey): void {
    if (qty <= 0) return this.remove(productId, sizeKey);
    this.items.update((list) => list.map((i) =>
      i.productId === productId && (i.sizeKey || undefined) === (sizeKey || undefined) ? { ...i, qty } : i,
    ));
  }

  remove(productId: string, sizeKey?: ProductSizeKey): void {
    this.items.update((list) => list.filter((i) =>
      !(i.productId === productId && (i.sizeKey || undefined) === (sizeKey || undefined)),
    ));
  }

  clear(): void {
    this.items.set([]);
  }

  private read(): CartItem[] {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  }

  private write(items: CartItem[]): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }
}
