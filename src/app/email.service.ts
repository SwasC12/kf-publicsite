import { Injectable } from '@angular/core';
import { Order } from './models';

/**
 * Fires transactional emails via the Worker endpoint (/api/send-email).
 * Fire-and-forget: never blocks or breaks the UX if email fails.
 */
@Injectable({ providedIn: 'root' })
export class EmailService {
  private post(payload: unknown): void {
    try {
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch {
      /* ignore */
    }
  }

  welcome(to: string, name: string): void {
    if (!to) return;
    this.post({ type: 'welcome', to, name });
  }

  orderPlaced(order: Order): void {
    this.post({
      type: 'order',
      to: order.customer.email,
      name: order.customer.name,
      phone: order.customer.phone,
      order: {
        reference: order.reference,
        total: order.total,
        items: order.items,
        delivery: order.delivery,
      },
    });
  }
}
