import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { ProductsService } from './products.service';
import { Product } from './models';

const KEY = 'kf.favorites.v1';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private products = inject(ProductsService);
  readonly ids = signal<string[]>(this.read());

  readonly count = computed(() => this.ids().length);
  readonly items = computed<Product[]>(() => {
    const set = new Set(this.ids());
    return this.products.products().filter((p) => set.has(p.id));
  });

  constructor() {
    effect(() => this.write(this.ids()));
  }

  has(id: string): boolean { return this.ids().includes(id); }

  toggle(id: string): void {
    this.ids.update((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  }

  private read(): string[] {
    try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : []; } catch { return []; }
  }
  private write(ids: string[]): void {
    try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* ignore */ }
  }
}
