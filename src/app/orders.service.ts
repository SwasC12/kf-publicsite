import { Injectable, inject, signal } from '@angular/core';
import { addDoc, collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDb } from './firebase';
import { EmailService } from './email.service';
import { Address, CartItem, DeliveryMethod, Order, OrderContact, OrderItem } from './models';

const LAST_KEY = 'kf.lastorder.v1';

function makeReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `KF-${pick}`;
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private email = inject(EmailService);
  readonly lastOrder = signal<Order | null>(this.readLast());
  readonly placing = signal(false);
  readonly error = signal<string | null>(null);

  async place(
    contact: OrderContact,
    delivery: Address,
    items: CartItem[],
    uid: string | null,
    deliveryMethod: DeliveryMethod,
    deliveryFee: number,
    discountCode?: string,
    discountAmount = 0,
  ): Promise<Order | null> {
    if (!items.length) return null;
    this.placing.set(true);
    this.error.set(null);

    const orderItems: OrderItem[] = items.map((i) => ({
      productId: i.productId, name: i.name, size: i.size, price: i.price, qty: i.qty,
    }));
    const subtotal = orderItems.reduce((n, i) => n + i.price * i.qty, 0);
    const fee = deliveryMethod === 'delivery' ? deliveryFee : 0;
    const disc = Math.min(discountAmount, subtotal);
    const total = Math.max(0, subtotal + fee - disc);
    const reference = makeReference();
    const now = Date.now();

    try {
      const ref = await addDoc(collection(getDb(), 'orders'), {
        reference, uid: uid ?? null, customer: contact, delivery, deliveryMethod, deliveryFee: fee,
        subtotal, discountCode: disc > 0 ? discountCode : undefined, discountAmount: disc > 0 ? disc : undefined,
        items: orderItems, total, status: 'pending', createdAt: now, updatedAt: now,
        serverCreatedAt: serverTimestamp(),
      });
      // Public status doc so customers can track by reference without an account.
      try {
        await setDoc(doc(getDb(), 'orderStatus', reference), {
          reference, status: 'pending', total, createdAt: now, updatedAt: now,
        });
      } catch { /* non-fatal */ }

      const order: Order = { id: ref.id, reference, uid, customer: contact, delivery, deliveryMethod, deliveryFee: fee, subtotal, discountCode: disc > 0 ? discountCode : undefined, discountAmount: disc > 0 ? disc : undefined, items: orderItems, total, status: 'pending', createdAt: now, updatedAt: now };
      this.lastOrder.set(order);
      this.writeLast(order);
      this.email.orderPlaced(order);
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
