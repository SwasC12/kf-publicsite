import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '@core/services/cart.service';
import { OrdersService } from '@core/services/orders.service';
import { SettingsService } from '@core/services/settings.service';
import { IconComponent } from '@shared/components/icon/icon.component';
import { MixingComponent } from '@shared/components/mixing/mixing.component';
import { formatPrice } from '@core/utils';

@Component({
  selector: 'app-confirmation',
  standalone: true,
  imports: [RouterLink, IconComponent, MixingComponent],
  templateUrl: './confirmation.component.html',
  styleUrl: './confirmation.component.scss',
})
export class ConfirmationComponent {
  readonly orders = inject(OrdersService);
  private cart = inject(CartService);
  private settings = inject(SettingsService);
  get bank() { return this.settings.bankingDetails(); }
  readonly copied = signal(false);
  readonly paid = signal(false);
  readonly checking = signal(false);
  price = formatPrice;

  constructor() {
    // Yoco sends the customer back with ?ref=... . Ask the Worker to verify the
    // checkout with Yoco, so the order is marked paid even if the webhook lags.
    const ref = new URLSearchParams(location.search).get('ref') || '';
    const last = this.orders.lastOrder();
    if (last?.status === 'paid') {
      this.paid.set(true);
      this.cart.clear();
    }
    else void this.confirmPayment(ref, last?.id || '');
  }

  private async confirmPayment(reference: string, orderId: string): Promise<void> {
    if (!reference && !orderId) return;
    this.checking.set(true);
    try {
      for (let attempt = 0; attempt < 4; attempt++) {
        const res = await fetch('/api/confirm-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference, orderId }),
        });
        const data = await res.json().catch(() => ({}));
        if (data && data.status === 'paid') {
          this.paid.set(true);
          this.cart.clear();
          const o = this.orders.lastOrder();
          if (o) this.orders.lastOrder.set({ ...o, status: 'paid' });
          return;
        }
        if (attempt < 3) await new Promise((r) => setTimeout(r, 2500));
      }
    } catch {
      /* the webhook or a later refresh will settle it */
    } finally {
      this.checking.set(false);
    }
  }

  copy(ref: string): void {
    navigator.clipboard?.writeText(ref).then(
      () => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 1800);
      },
      () => {},
    );
  }
}
