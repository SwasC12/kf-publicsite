import { Injectable, signal } from '@angular/core';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDb } from './firebase';
import { CartItem, Order, OrderCustomer, OrderItem } from './models';

const LAST_KEY = 'kf.lastorder.v1';

function makeReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  const pick = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `KF-${pick}`;
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  /** The order just placed — used by the confirmation page (anonymous users can't re-read it). */
  readonly lastOrder = signal<Order | null>(this.readLast());
  readonly placing = signal(false);
  readonly error = signal<string | null>(null);

  async place(customer: OrderCustomer, items: CartItem[]): Promise<Order | null> {
    if (!items.length) return null;
    this.placing.set(true);
    this.error.set(null);

    const orderItems: OrderItem[] = items.map((i) => ({
      productId: i.productId,
      name: i.name,
      size: i.size,
      price: i.price,
      qty: i.qty,
    }));
    const total = orderItems.reduce((n, i) => n + i.price * i.qty, 0);
    const reference = makeReference();
    const now = Date.now();

    const payload = {
      reference,
      customer,
      items: orderItems,
      total,
      status: 'pending' as const,
      createdAt: now,
      updatedAt: now,
      serverCreatedAt: serverTimestamp(),
    };

    try {
      const ref = await addDoc(collection(getDb(), 'orders'), payload);
      const order: Order = { id: ref.id, reference, customer, items: orderItems, total, status: 'pending', createdAt: now, updatedAt: now };
      this.lastOrder.set(order);
      this.writeLast(order);
      return order;
    } catch {
      this.error.set('Sorry, we could not place your order. Please try again.');
      return null;
    } finally {
      this.placing.set(false);
    }
  }

  private readLast(): Order | null {
    try {
      const raw = localStorage.getItem(LAST_KEY);
      return raw ? (JSON.parse(raw) as Order) : null;
    } catch {
      return null;
    }
  }

  private writeLast(o: Order): void {
    try {
      localStorage.setItem(LAST_KEY, JSON.stringify(o));
    } catch {
      /* ignore */
    }
  }
}
