import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CartService } from '@core/services/cart.service';
import { OrdersService } from '@core/services/orders.service';
import { AuthService } from '@core/services/auth.service';
import { CustomerService } from '@core/services/customer.service';
import { SettingsService } from '@core/services/settings.service';
import { Address, DeliveryMethod, Discount, emptyAddress } from '@core/models';
import { discountError, computeDiscount, givesFreeDelivery, DiscountLine } from '@core/utils/discount';
import { getAuthInstance } from '@core/firebase/firebase';
import { SA_PROVINCES, formatPrice, isValidEmail, isValidPhone } from '@core/utils';
import { IconComponent } from '@shared/components/icon/icon.component';

type Field = 'name' | 'email' | 'phone' | 'line1' | 'city' | 'terms';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss',
})
export class CheckoutComponent {
  readonly cart = inject(CartService);
  readonly orders = inject(OrdersService);
  readonly auth = inject(AuthService);
  readonly settings = inject(SettingsService);
  readonly cust = inject(CustomerService);

  name = ''; email = ''; phone = ''; note = '';
  delivery: Address = emptyAddress();
  readonly method = signal<DeliveryMethod>('delivery');
  promo = '';
  referral = '';
  readonly applied = signal<Discount | null>(null);
  readonly promoError = signal<string | null>(null);
  readonly promoBusy = signal(false);
  /** Gender / category of the cart's products (from the promo check) so targeted codes re-check locally. */
  private readonly productInfo = signal<Record<string, { gender?: string | null; category?: string | null }>>({});
  /** Fields the customer has left at least once — errors only show after that (or after submit). */
  readonly touched = signal<ReadonlySet<Field>>(new Set());
  readonly submitted = signal(false);
  readonly redirecting = signal(false);
  termsAccepted = false;
  readonly provinces = SA_PROVINCES;

  readonly threshold = computed(() => this.settings.settings().freeDeliveryThreshold ?? null);
  /** Delivery fee before any promo code. */
  readonly baseFee = computed(() => (this.method() === 'delivery' ? this.settings.deliveryFeeFor(this.cart.total()) : 0));
  /** A free-delivery code is applied and there is a fee for it to waive. */
  readonly freeDelivery = computed(() => givesFreeDelivery(this.applied()) && this.method() === 'delivery' && this.baseFee() > 0);
  readonly fee = computed(() => (this.freeDelivery() ? 0 : this.baseFee()));
  private lines(): DiscountLine[] {
    const info = this.productInfo();
    return this.cart.items().map((i) => ({
      unitPrice: i.price,
      qty: i.qty,
      productId: i.productId,
      sizeKey: i.sizeKey || null,
      size: i.size || null,
      gender: info[i.productId]?.gender ?? null,
      category: info[i.productId]?.category ?? null,
    }));
  }
  readonly discountAmount = computed(() => {
    const d = this.applied();
    return d ? computeDiscount(d, this.lines()) : 0;
  });
  readonly grandTotal = computed(() => Math.max(0, this.cart.total() + this.fee() - this.discountAmount()));

  price = formatPrice;

  constructor() {
    // Lets global styles move floating widgets out of the way of the pay button.
    document.body.classList.add('on-checkout');
    inject(DestroyRef).onDestroy(() => document.body.classList.remove('on-checkout'));

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

  touch(f: Field): void {
    if (this.touched().has(f)) return;
    this.touched.update((s) => new Set(s).add(f));
  }

  /** Inline validation message for a field, or null when it is fine / not yet visited. */
  error(f: Field): string | null {
    if (!this.submitted() && !this.touched().has(f)) return null;
    switch (f) {
      case 'name': return this.name.trim() ? null : 'Please enter your full name.';
      case 'email': return isValidEmail(this.email) ? null : 'Please enter a valid email address.';
      case 'phone': return isValidPhone(this.phone) ? null : 'Enter a valid SA number, e.g. 082 123 4567.';
      case 'line1':
        return this.method() === 'collection' || this.delivery.line1.trim() ? null : 'Please enter your street address.';
      case 'city':
        return this.method() === 'collection' || this.delivery.city.trim() ? null : 'Please enter your city or town.';
      case 'terms': return this.termsAccepted ? null : 'Please accept the terms to continue.';
    }
  }

  async applyPromo(): Promise<void> {
    const code = this.promo.trim().toUpperCase();
    if (!code || this.promoBusy()) return;
    this.promoError.set(null);
    this.promoBusy.set(true);
    try {
      // Validated on the server; codes are no longer readable from the browser.
      // The ID token lets the server check once-per-customer / first-order codes.
      const user = getAuthInstance().currentUser;
      const token = user ? await user.getIdToken().catch(() => '') : '';
      const res = await fetch('/api/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: JSON.stringify({
          code,
          items: this.cart.items().map((i) => ({ productId: i.productId, sizeKey: i.sizeKey || '', qty: i.qty })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.discount) {
        this.applied.set(null);
        this.promoError.set(data.error || 'Could not check that code.');
        return;
      }
      this.productInfo.set(data.products && typeof data.products === 'object' ? data.products : {});
      const d: Discount = { ...(data.discount as Discount), code };
      const err = discountError(d, this.lines(), 'online');
      if (err) { this.applied.set(null); this.promoError.set(err); return; }
      this.applied.set(d);
    } catch {
      this.promoError.set('Could not check that code.');
    } finally {
      this.promoBusy.set(false);
    }
  }
  clearPromo(): void { this.applied.set(null); this.productInfo.set({}); this.promo = ''; this.promoError.set(null); }

  feeLabel(): string {
    const f = this.settings.deliveryFeeFor(this.cart.total());
    return f === 0 || givesFreeDelivery(this.applied()) ? 'Free' : formatPrice(f);
  }

  hasAccountAddresses(): boolean {
    const p = this.cust.profile();
    if (!p) return false;
    return !!p.billing?.line1?.trim() && !!p.billing?.city?.trim()
      && !!p.delivery?.line1?.trim() && !!p.delivery?.city?.trim();
  }

  valid(): boolean {
    const base = this.auth.isLoggedIn() && this.hasAccountAddresses()
      && !!this.name.trim() && isValidEmail(this.email) && isValidPhone(this.phone) && this.termsAccepted;
    if (this.method() === 'collection') return base;
    return base && !!this.delivery.line1.trim() && !!this.delivery.city.trim();
  }

  async place(): Promise<void> {
    if (this.orders.placing() || this.redirecting()) return;
    this.submitted.set(true);
    if (!this.valid()) {
      // Take the customer to the first field that needs attention.
      setTimeout(() => {
        const el = document.querySelector<HTMLElement>('.checkout-form [aria-invalid="true"]');
        el?.focus();
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
      return;
    }
    const order = await this.orders.place(
      { name: this.name.trim(), email: this.email.trim(), phone: this.phone.trim(), note: this.note.trim() || undefined },
      this.delivery,
      this.cart.items(),
      this.auth.user()?.uid ?? null,
      this.method(),
      this.fee(),
      this.applied()?.code,
      this.discountAmount(),
      this.referral.trim(),
    );
    const redirect = this.orders.redirectUrl();
    if (order && redirect) {
      void this.cust.refresh();
      // Keep the cart until the payment is confirmed. If Yoco fails or the
      // customer cancels, their items are still there to try again.
      this.redirecting.set(true);
      window.location.href = redirect;
      return;
    }
    // Bring the error message into view (it sits above the pay button).
    setTimeout(() => document.getElementById('checkout-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
  }
}
