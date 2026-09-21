import { Component, effect, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService } from './cart.service';
import { OrdersService } from './orders.service';
import { AuthService } from './auth.service';
import { CustomerService } from './customer.service';
import { Address, emptyAddress } from './models';
import { formatPrice } from './util';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [FormsModule, RouterLink, NgTemplateOutlet],
  template: `
    @if (cart.items().length === 0) {
      <div class="notice"><p>Your cart is empty.</p><a class="btn primary" routerLink="/">Browse fragrances</a></div>
    } @else {
      <h1 class="page-title">Checkout</h1>
      @if (!auth.isLoggedIn()) {
        <p class="checkout-signin">Have an account? <a routerLink="/account">Sign in</a> to use your saved details — or check out as a guest below.</p>
      }
      <div class="checkout-grid">
        <form class="checkout-form" (ngSubmit)="place()">
          <h2 class="block-title">Contact</h2>
          <label>Full name*<input type="text" name="name" [(ngModel)]="name" required autocomplete="name" /></label>
          <label>Email*<input type="email" name="email" [(ngModel)]="email" required autocomplete="email" /></label>
          <label>Phone / WhatsApp*<input type="tel" name="phone" [(ngModel)]="phone" required autocomplete="tel" /></label>

          <h2 class="block-title">Delivery address</h2>
          <ng-container *ngTemplateOutlet="addr; context: { $implicit: delivery }" />

          <label>Order note (optional)<textarea name="note" rows="2" [(ngModel)]="note" placeholder="Delivery instructions, preferences…"></textarea></label>

          <p class="pay-info">Payment is by <strong>EFT / bank transfer</strong>. After placing your order you'll get a reference and our banking details — no card needed.</p>
          @if (orders.error()) { <div class="notice error">{{ orders.error() }}</div> }
          <button type="submit" class="btn primary big" [disabled]="!valid() || orders.placing()">
            {{ orders.placing() ? 'Placing order…' : 'Place order' }}
          </button>
        </form>

        <aside class="order-summary">
          <h2 class="block-title">Order summary</h2>
          @for (i of cart.items(); track i.productId) {
            <div class="sum-row"><span>{{ i.qty }} × {{ i.name }}@if (i.size) { <span class="dim"> ({{ i.size }})</span> }</span><span>{{ price(i.price * i.qty) }}</span></div>
          }
          <div class="sum-total"><span>Total</span><strong>{{ price(cart.total()) }}</strong></div>
        </aside>
      </div>
    }

    <ng-template #addr let-a>
      <label>Address line 1*<input type="text" [ngModel]="a.line1" (ngModelChange)="a.line1=$event" name="l1" required /></label>
      <label>Address line 2<input type="text" [ngModel]="a.line2" (ngModelChange)="a.line2=$event" name="l2" /></label>
      <div class="row">
        <label>City*<input type="text" [ngModel]="a.city" (ngModelChange)="a.city=$event" name="city" required /></label>
        <label>Province<input type="text" [ngModel]="a.province" (ngModelChange)="a.province=$event" name="prov" /></label>
      </div>
      <div class="row">
        <label>Postal code<input type="text" [ngModel]="a.postalCode" (ngModelChange)="a.postalCode=$event" name="pc" /></label>
        <label>Country<input type="text" [ngModel]="a.country" (ngModelChange)="a.country=$event" name="co" /></label>
      </div>
    </ng-template>
  `,
})
export class CheckoutComponent {
  readonly cart = inject(CartService);
  readonly orders = inject(OrdersService);
  readonly auth = inject(AuthService);
  private cust = inject(CustomerService);
  private router = inject(Router);

  name = ''; email = ''; phone = ''; note = '';
  delivery: Address = emptyAddress();

  price = formatPrice;

  constructor() {
    // Prefill from the signed-in customer's saved profile.
    effect(() => {
      const p = this.cust.profile();
      if (p) {
        if (!this.name) this.name = p.name;
        if (!this.email) this.email = p.email;
        if (!this.phone) this.phone = p.phone;
        if (!this.delivery.line1 && p.delivery.line1) this.delivery = { ...p.delivery };
      }
    });
  }

  valid(): boolean {
    return !!this.name.trim() && !!this.email.trim() && !!this.phone.trim() && !!this.delivery.line1.trim() && !!this.delivery.city.trim();
  }

  async place(): Promise<void> {
    if (!this.valid()) return;
    const order = await this.orders.place(
      { name: this.name.trim(), email: this.email.trim(), phone: this.phone.trim(), note: this.note.trim() || undefined },
      this.delivery,
      this.cart.items(),
      this.auth.user()?.uid ?? null,
    );
    if (order) {
      this.cart.clear();
      this.router.navigate(['/order-confirmed']);
    }
  }
}
