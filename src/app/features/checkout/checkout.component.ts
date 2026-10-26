import { Component, computed, effect, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '@core/services/cart.service';
import { OrdersService } from '@core/services/orders.service';
import { AuthService } from '@core/services/auth.service';
import { CustomerService } from '@core/services/customer.service';
import { SettingsService } from '@core/services/settings.service';
import { Address, DeliveryMethod, Discount, emptyAddress } from '@core/models';
import { discountError, computeDiscount, DiscountLine } from '@core/utils/discount';
import { SA_PROVINCES, formatPrice, isValidEmail, isValidPhone } from '@core/utils';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [FormsModule, RouterLink, NgTemplateOutlet, IconComponent],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss',
})
export class CheckoutComponent {
  readonly cart = inject(CartService);
  readonly orders = inject(OrdersService);
  readonly auth = inject(AuthService);
  readonly settings = inject(SettingsService);
  readonly cust = inject(CustomerService);
  private router = inject(Router);

  name = ''; email = ''; phone = ''; note = '';
  delivery: Address = emptyAddress();
  readonly method = signal<DeliveryMethod>('delivery');
  promo = '';
  readonly applied = signal<Discount | null>(null);
  readonly promoError = signal<string | null>(null);
  readonly emailTouched = signal(false);
  readonly phoneTouched = signal(false);
  readonly termsError = signal(false);
  termsAccepted = false;
  readonly provinces = SA_PROVINCES;
  readonly emailError = computed(() =>
    this.emailTouched() && !isValidEmail(this.email) ? 'Please enter a valid email address.' : null,
  );
  readonly phoneError = computed(() =>
    this.phoneTouched() && !isValidPhone(this.phone) ? 'Enter a valid SA number, e.g. 082 123 4567.' : null,
  );

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
      // Validated on the server; codes are no longer readable from the browser.
      const res = await fetch('/api/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const d: Discount = { ...(data.discount as Discount), code };
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
    this.emailTouched.set(true);
    this.phoneTouched.set(true);
    this.termsError.set(!this.termsAccepted);
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
      'yoco',
    );
    if (order) {
      this.cart.clear();
      void this.cust.refresh();
      const redirect = this.orders.redirectUrl();
      if (redirect) {
        window.location.href = redirect;
        return;
      }
      this.router.navigate(['/order-confirmed']);
    }
  }
}
