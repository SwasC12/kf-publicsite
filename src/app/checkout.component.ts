import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService } from './cart.service';
import { OrdersService } from './orders.service';
import { IconComponent } from './icon.component';
import { formatPrice } from './util';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  template: `
    @if (cart.items().length === 0) {
      <div class="notice">
        <p>Your cart is empty.</p>
        <a class="btn primary" routerLink="/">Browse fragrances</a>
      </div>
    } @else {
      <h1 class="page-title">Checkout</h1>
      <div class="checkout-grid">
        <form class="checkout-form" (ngSubmit)="place()">
          <h2>Your details</h2>
          <label>Full name*
            <input type="text" name="name" [(ngModel)]="name" required autocomplete="name" />
          </label>
          <label>Email*
            <input type="email" name="email" [(ngModel)]="email" required autocomplete="email" />
          </label>
          <label>Phone / WhatsApp*
            <input type="tel" name="phone" [(ngModel)]="phone" required autocomplete="tel" />
          </label>
          <label>Note (optional)
            <textarea name="note" rows="2" [(ngModel)]="note" placeholder="Delivery area, preferences…"></textarea>
          </label>

          <p class="pay-info">
            Payment is by <strong>EFT / bank transfer</strong>. After placing your order you'll get a
            reference and our banking details — no card needed.
          </p>

          @if (orders.error()) { <div class="notice error">{{ orders.error() }}</div> }

          <button type="submit" class="btn primary big" [disabled]="!valid() || orders.placing()">
            @if (orders.placing()) { Placing order… } @else { Place order <app-icon name="arrow-right" [size]="18" /> }
          </button>
        </form>

        <aside class="order-summary">
          <h2>Order summary</h2>
          @for (i of cart.items(); track i.productId) {
            <div class="sum-row">
              <span>{{ i.qty }} × {{ i.name }}@if (i.size) { <span class="dim"> ({{ i.size }})</span> }</span>
              <span>{{ price(i.price * i.qty) }}</span>
            </div>
          }
          <div class="sum-total"><span>Total</span><strong>{{ price(cart.total()) }}</strong></div>
        </aside>
      </div>
    }
  `,
})
export class CheckoutComponent {
  readonly cart = inject(CartService);
  readonly orders = inject(OrdersService);
  private router = inject(Router);

  name = '';
  email = '';
  phone = '';
  note = '';

  price = formatPrice;

  valid(): boolean {
    return !!this.name.trim() && !!this.email.trim() && !!this.phone.trim();
  }

  async place(): Promise<void> {
    if (!this.valid()) return;
    const order = await this.orders.place(
      {
        name: this.name.trim(),
        email: this.email.trim(),
        phone: this.phone.trim(),
        note: this.note.trim() || undefined,
      },
      this.cart.items(),
    );
    if (order) {
      this.cart.clear();
      this.router.navigate(['/order-confirmed']);
    }
  }
}
