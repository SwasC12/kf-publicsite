import { Injectable, signal } from '@angular/core';
import {
  collection, addDoc, doc, updateDoc, onSnapshot, query, where, increment, Unsubscribe,
} from 'firebase/firestore';
import { getDb } from './firebase';
import { Review } from './models';

/** Loads and posts product reviews. One live listener at a time (per product page). */
@Injectable({ providedIn: 'root' })
export class ReviewsService {
  readonly reviews = signal<Review[]>([]);
  readonly loading = signal(false);
  private unsub?: Unsubscribe;
  private current?: string;

  watch(productId: string): void {
    if (this.current === productId) return;
    this.stop();
    this.current = productId;
    this.loading.set(true);
    try {
      this.unsub = onSnapshot(
        query(collection(getDb(), 'reviews'), where('productId', '==', productId)),
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Review, 'id'>) }));
          list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          this.reviews.set(list);
          this.loading.set(false);
        },
        () => { this.reviews.set([]); this.loading.set(false); },
      );
    } catch { this.reviews.set([]); this.loading.set(false); }
  }

  stop(): void {
    this.unsub?.();
    this.unsub = undefined;
    this.current = undefined;
    this.reviews.set([]);
  }

  async add(productId: string, name: string, rating: number, text: string): Promise<void> {
    const r = Math.max(1, Math.min(5, Math.round(rating)));
    await addDoc(collection(getDb(), 'reviews'), {
      productId, name: name.trim().slice(0, 60) || 'Anonymous',
      rating: r, text: text.trim().slice(0, 600), createdAt: Date.now(),
    });
    // Update the cached aggregate on the product (rules allow this exact change).
    try {
      await updateDoc(doc(getDb(), 'products', productId), {
        ratingSum: increment(r), ratingCount: increment(1),
      });
    } catch { /* aggregate is best-effort */ }
  }
}
