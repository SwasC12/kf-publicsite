import { Injectable, computed, effect, signal } from '@angular/core';
import { CartItem, Product, effectivePrice } from './models';
import { productImage } from './util';

const KEY = 'kf.cart.v1';

@Injectable({ providedIn: 'root' })
export class CartService {
  readonly items = signal<CartItem[]>(this.read());

  readonly count = computed(() => this.items().reduce((n, i) => n + i.qty, 0));
  readonly total = computed(() => this.items().reduce((n, i) => n + i.price * i.qty, 0));
  /** Signals the most recently added product (for the "added to cart" toast). */
  readonly lastAdd = signal<{ name: string; at: number } | null>(null);

  qtyOf(productId: string): number {
    return this.items().find((i) => i.productId === productId)?.qty ?? 0;
  }

  constructor() {
    effect(() => this.write(this.items()));
  }

  add(p: Product, qty = 1): void {
    this.items.update((list) => {
      const existing = list.find((i) => i.productId === p.id);
      if (existing) {
        return list.map((i) => (i.productId === p.id ? { ...i, qty: i.qty + qty } : i));
      }
      return [
        ...list,
        { productId: p.id, name: p.name, size: p.size, price: effectivePrice(p), imageUrl: productImage(p), qty },
      ];
    });
    this.lastAdd.set({ name: p.name, at: Date.now() });
  }

  setQty(productId: string, qty: number): void {
    if (qty <= 0) return this.remove(productId);
    this.items.update((list) => list.map((i) => (i.productId === productId ? { ...i, qty } : i)));
  }

  remove(productId: string): void {
    this.items.update((list) => list.filter((i) => i.productId !== productId));
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
