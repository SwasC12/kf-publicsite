import { Injectable, signal } from '@angular/core';
import { getAuthInstance } from '@core/firebase/firebase';
import { Address, CartItem, DeliveryMethod, Order, OrderContact } from '@core/models';

const LAST_KEY = 'kf.lastorder.v1';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  readonly lastOrder = signal<Order | null>(this.readLast());
  readonly placing = signal(false);
  readonly error = signal<string | null>(null);
  readonly redirectUrl = signal<string | null>(null);

  /**
   * Places an order on the server. The Worker re-reads every product, works out
   * the real price, fees and discount, and only then writes the order. Nothing
   * money-related is trusted from the browser.
   */
  async place(
    contact: OrderContact,
    delivery: Address,
    items: CartItem[],
    _uid: string | null,
    deliveryMethod: DeliveryMethod,
    _deliveryFee: number,
    discountCode?: string,
    _discountAmount = 0,
    paymentMethod: 'eft' | 'yoco' = 'yoco',
  ): Promise<Order | null> {
    if (!items.length) return null;
    this.placing.set(true);
    this.error.set(null);

    try {
      const user = getAuthInstance().currentUser;
      const token = user ? await user.getIdToken() : '';
      const res = await fetch('/api/place-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: JSON.stringify({
          contact,
          delivery,
          deliveryMethod,
          items: items.map((i) => ({ productId: i.productId, sizeKey: i.sizeKey || '', qty: i.qty })),
          discountCode: discountCode || '',
          paymentMethod,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.order) {
        this.error.set(data.error || 'Sorry, we could not place your order. Please try again.');
        return null;
      }

      const order = data.order as Order;
      this.redirectUrl.set(data.redirectUrl || null);
      this.lastOrder.set(order);
      this.writeLast(order);
      return order;
    } catch {
      this.error.set('Could not reach the shop. Check your connection and try again.');
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
