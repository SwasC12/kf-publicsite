import { Component, computed, effect, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { getDb } from './firebase';
import { CartService } from './cart.service';
import { OrdersService } from './orders.service';
import { AuthService } from './auth.service';
import { CustomerService } from './customer.service';
import { SettingsService } from './settings.service';
import { Address, DeliveryMethod, Discount, emptyAddress } from './models';
import { discountError, computeDiscount, DiscountLine } from './discount-util';
import { formatPrice } from './util';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [FormsModule, RouterLink, NgTemplateOutlet],
  template: `
    @if (cart.items().length === 0) {
      <div class="notice"><p>Your cart is empty.</p><a class="btn primary" routerLink="/">Browse fragrances</a></div>
    } @else if (settings.settings().storeOpen === false) {
      <div class="notice"><h2 class="section-title">We're currently closed</h2><p>{{ settings.settings().storeClosedMessage || 'The shop is temporarily not taking orders. Please check back soon.' }}</p><a class="btn" routerLink="/">Back to shop</a></div>
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

          <h2 class="block-title">Delivery</h2>
          <div class="method-toggle">
            @if (settings.settings().deliveryEnabled !== false) {
              <label class="method" [class.on]="method() === 'delivery'">
                <input type="radio" name="method" value="delivery" [ngModel]="method()" (ngModelChange)="method.set('delivery')" />
                <span>Deliver to me <em>{{ feeLabel() }}</em></span>
              </label>
            }
            @if (settings.settings().collectionEnabled !== false) {
              <label class="method" [class.on]="method() === 'collection'">
                <input type="radio" name="method" value="collection" [ngModel]="method()" (ngModelChange)="method.set('collection')" />
                <span>Collect <em>Free</em></span>
              </label>
            }
          </div>

          @if (method() === 'delivery') {
            <ng-container *ngTemplateOutlet="addr; context: { $implicit: delivery }" />
          } @else {
            <p class="pay-info">{{ settings.settings().collectionNote || 'We\\'ll arrange collection details with you after your order.' }}</p>
          }

          <label>Order note (optional)<textarea name="note" rows="2" [(ngModel)]="note" placeholder="Delivery instructions, preferences…"></textarea></label>

          <h2 class="block-title">Promo code</h2>
          <div class="promo-row">
            <input type="text" name="promo" [(ngModel)]="promo" placeholder="Enter code" style="text-transform:uppercase" />
            @if (applied()) {
              <button type="button" class="btn" (click)="clearPromo()">Remove</button>
            } @else {
              <button type="button" class="btn" (click)="applyPromo()" [disabled]="!promo.trim()">Apply</button>
            }
          </div>
          @if (applied()) { <p class="promo-ok">Code {{ applied()!.code }} applied — {{ discountAmount() > 0 ? '−' + price(discountAmount()) : 'no discount' }}</p> }
          @if (promoError()) { <p class="form-error">{{ promoError() }}</p> }

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
          <div class="sum-row"><span>Subtotal</span><span>{{ price(cart.total()) }}</span></div>
          <div class="sum-row"><span>{{ method() === 'collection' ? 'Collection' : 'Delivery' }}</span><span>{{ fee() === 0 ? 'Free' : price(fee()) }}</span></div>
          @if (discountAmount() > 0) { <div class="sum-row"><span>Discount ({{ applied()!.code }})</span><span>−{{ price(discountAmount()) }}</span></div> }
          <div class="sum-total"><span>Total</span><strong>{{ price(grandTotal()) }}</strong></div>
          @if (method() === 'delivery' && fee() > 0 && threshold()) {
            <p class="ship-hint">Spend {{ price(threshold()! - cart.total()) }} more for free delivery.</p>
          }
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
  readonly settings = inject(SettingsService);
  private cust = inject(CustomerService);
  private router = inject(Router);

  name = ''; email = ''; phone = ''; note = '';
  delivery: Address = emptyAddress();
  readonly method = signal<DeliveryMethod>('delivery');
  promo = '';
  readonly applied = signal<Discount | null>(null);
  readonly promoError = signal<string | null>(null);

  readonly threshold = computed(() => this.settings.settings().freeDeliveryThreshold ?? null);
  readonly fee = computed(() => (this.method() === 'delivery' ? this.settings.deliveryFeeFor(this.cart.total()) : 0));
  private lines(): DiscountLine[] {
    return this.cart.items().map((i) => ({ unitPrice: i.price, qty: i.qty }));
  }
  readonly discountAmount = computed(() => {
    const d = this.applied();
    return d ? computeDiscount(d, this.lines()) : 0;
  });
  readonly grandTotal = computed(() => Math.max(0, this.cart.total() + this.fee() - this.discountAmount()));

  price = formatPrice;

  async applyPromo(): Promise<void> {
    const code = this.promo.trim().toUpperCase();
    if (!code) return;
    this.promoError.set(null);
    try {
      const snap = await getDoc(doc(getDb(), 'discounts', code));
      if (!snap.exists()) { this.applied.set(null); this.promoError.set('That code is not valid.'); return; }
      const d: Discount = { code, ...(snap.data() as Omit<Discount, 'code'>) };
      const err = discountError(d, this.lines(), 'online');
      if (err) { this.applied.set(null); this.promoError.set(err); return; }
      this.applied.set(d);
    } catch {
      this.promoError.set('Could not check that code.');
    }
  }
  clearPromo(): void { this.applied.set(null); this.promo = ''; this.promoError.set(null); }

  constructor() {
    // Default to whichever method is enabled.
    effect(() => {
      const s = this.settings.settings();
      if (s.deliveryEnabled === false && s.collectionEnabled !== false) this.method.set('collection');
    });
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

  feeLabel(): string {
    const f = this.settings.deliveryFeeFor(this.cart.total());
    return f === 0 ? 'Free' : formatPrice(f);
  }

  valid(): boolean {
    const base = !!this.name.trim() && !!this.email.trim() && !!this.phone.trim();
    if (this.method() === 'collection') return base;
    return base && !!this.delivery.line1.trim() && !!this.delivery.city.trim();
  }

  async place(): Promise<void> {
    if (!this.valid()) return;
    const order = await this.orders.place(
      { name: this.name.trim(), email: this.email.trim(), phone: this.phone.trim(), note: this.note.trim() || undefined },
      this.delivery,
      this.cart.items(),
      this.auth.user()?.uid ?? null,
      this.method(),
      this.fee(),
      this.applied()?.code,
      this.discountAmount(),
    );
    if (order) {
      const code = this.applied()?.code;
      if (code && this.discountAmount() > 0) {
        try { await updateDoc(doc(getDb(), 'discounts', code), { usedCount: increment(1) }); } catch { /* non-fatal */ }
      }
      this.cart.clear();
      this.router.navigate(['/order-confirmed']);
    }
  }
}
