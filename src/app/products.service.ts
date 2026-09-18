import { Injectable, signal } from '@angular/core';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { getDb } from './firebase';
import { Product } from './models';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  readonly products = signal<Product[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    try {
      const q = query(collection(getDb(), 'products'), where('active', '==', true));
      onSnapshot(
        q,
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, 'id'>) }));
          list.sort((a, b) => a.name.localeCompare(b.name));
          this.products.set(list);
          this.loading.set(false);
        },
        () => {
          this.error.set('Could not load products. Please try again later.');
          this.loading.set(false);
        },
      );
    } catch {
      this.error.set('Could not connect to the store.');
      this.loading.set(false);
    }
  }

  byId(id: string): Product | undefined {
    return this.products().find((p) => p.id === id);
  }
}
