import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrdersService } from './orders.service';
import { SettingsService } from './settings.service';
import { IconComponent } from './icon.component';
import { formatPrice } from './util';

@Component({
  selector: 'app-confirmation',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    @if (orders.lastOrder(); as o) {
      <div class="confirm">
        <div class="confirm-head">
          <app-icon name="check-circle" [size]="52" />
          <h1>Order placed!</h1>
          <p>Thank you, {{ o.customer.name }}. We've received your order.</p>
        </div>

        <div class="ref-box">
          <span class="ref-label">Your payment reference</span>
          <div class="ref-value">
            <strong>{{ o.reference }}</strong>
            <button class="icon-btn" title="Copy reference" (click)="copy(o.reference)">
              <app-icon [name]="copied() ? 'check' : 'copy'" [size]="18" />
            </button>
          </div>
          <span class="ref-hint">Use this reference on your EFT so we can match your payment.</span>
        </div>

        <div class="pay-card">
          <h2>Pay by EFT</h2>
          <p>Please transfer <strong>{{ price(o.total) }}</strong> to:</p>
          <dl class="bank">
            <div><dt>Account name</dt><dd>{{ bank.accountName }}</dd></div>
            <div><dt>Bank</dt><dd>{{ bank.bank }}</dd></div>
            <div><dt>Account no.</dt><dd>{{ bank.accountNumber }}</dd></div>
            <div><dt>Branch code</dt><dd>{{ bank.branchCode }}</dd></div>
            <div><dt>Account type</dt><dd>{{ bank.accountType }}</dd></div>
            <div><dt>Reference</dt><dd>{{ o.reference }}</dd></div>
          </dl>
          <p class="pay-note">
            Once we confirm your payment we'll be in touch to arrange delivery/collection.
            Questions? Email <a [href]="'mailto:' + bank.contactEmail">{{ bank.contactEmail }}</a>
            or call {{ bank.contactPhone }}.
          </p>
        </div>

        <div class="order-summary standalone">
          <h2>What you ordered</h2>
          @for (i of o.items; track i.productId) {
            <div class="sum-row">
              <span>{{ i.qty }} × {{ i.name }}@if (i.size) { <span class="dim"> ({{ i.size }})</span> }</span>
              <span>{{ price(i.price * i.qty) }}</span>
            </div>
          }
          @if (o.subtotal != null) { <div class="sum-row"><span>Subtotal</span><span>{{ price(o.subtotal) }}</span></div> }
          <div class="sum-row"><span>{{ o.deliveryMethod === 'collection' ? 'Collection' : 'Delivery' }}</span><span>{{ (o.deliveryFee || 0) === 0 ? 'Free' : price(o.deliveryFee!) }}</span></div>
          <div class="sum-total"><span>Total</span><strong>{{ price(o.total) }}</strong></div>
        </div>

        <a class="btn big" routerLink="/">Back to shop</a>
      </div>
    } @else {
      <div class="notice">
        <p>No recent order to show.</p>
        <a class="btn primary" routerLink="/">Back to shop</a>
      </div>
    }
  `,
})
export class ConfirmationComponent {
  readonly orders = inject(OrdersService);
  private settings = inject(SettingsService);
  get bank() { return this.settings.bankingDetails(); }
  readonly copied = signal(false);
  price = formatPrice;

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
