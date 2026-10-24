import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SeoService } from './seo.service';
import { IconComponent } from './icon.component';
import { OrderStatus } from './models';
import { formatPrice } from './util';

interface StatusDoc { reference: string; status: OrderStatus; total: number; createdAt: number; updatedAt: number; courier?: string; trackingNumber?: string; }
const STEPS: OrderStatus[] = ['pending', 'paid', 'fulfilled', 'shipped', 'delivered'];

@Component({
  selector: 'app-track',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  template: `
    <div class="track reveal">
      <h1 class="page-title">Track your order</h1>
      <p class="auth-sub">Enter your order reference and the email address used on the order.</p>
      <form class="track-form" (ngSubmit)="lookup()">
        <input type="text" [(ngModel)]="ref" name="ref" placeholder="KF-XXXXX" autocomplete="off" autocapitalize="characters" />
        <input type="email" [(ngModel)]="email" name="email" placeholder="you@email.com" autocomplete="email" />
        <button type="submit" class="btn primary" [disabled]="busy() || !ref.trim() || !email.trim()">{{ busy() ? 'Checking…' : 'Track' }}</button>
      </form>

      @if (notFound()) { <div class="notice error">No order found with that reference. Check the code and try again.</div> }

      @if (result(); as r) {
        <div class="track-result">
          <div class="track-head">
            <span class="hist-ref">{{ r.reference }}</span>
            <span class="status-pill" [attr.data-status]="r.status">{{ r.status === 'fulfilled' || r.status === 'shipped' ? 'on its way' : r.status }}</span>
          </div>
          @if (r.status === 'cancelled') {
            <p>This order was cancelled. If that's unexpected, please <a routerLink="/contact">contact us</a>.</p>
          } @else {
            <ol class="track-steps">
              @for (s of steps; track s; let i = $index) {
                <li [class.done]="stepIndex(r.status) >= i" [class.current]="stepIndex(r.status) === i">
                  <span class="tick">@if (stepIndex(r.status) >= i) { <app-icon name="check" [size]="14" /> }</span>
                  {{ label(s) }}
                </li>
              }
            </ol>
          }
          <p class="track-total">Order total: <strong>{{ price(r.total) }}</strong></p>
          @if (r.courier || r.trackingNumber) {
            <div class="track-courier">
              <span class="track-courier-label">Courier</span>
              <strong>{{ r.courier || 'Courier' }}</strong>
              @if (r.trackingNumber) { <span class="track-courier-no">{{ r.trackingNumber }}</span> }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class TrackComponent {
  ref = '';
  email = '';
  readonly busy = signal(false);
  readonly notFound = signal(false);
  readonly result = signal<StatusDoc | null>(null);
  readonly steps = STEPS;
  price = formatPrice;

  constructor() { inject(SeoService).page('Track order'); }

  async lookup(): Promise<void> {
    const code = this.ref.trim().toUpperCase();
    const email = this.email.trim();
    if (!code || !email) return;
    this.busy.set(true);
    this.notFound.set(false);
    this.result.set(null);
    try {
      const res = await fetch('/api/lookup-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: code, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.order) this.result.set(data.order as StatusDoc);
      else this.notFound.set(true);
    } catch {
      this.notFound.set(true);
    } finally {
      this.busy.set(false);
    }
  }

  stepIndex(s: OrderStatus): number { return STEPS.indexOf(s); }
  label(s: OrderStatus): string {
    return s === 'pending' ? 'Order received'
      : s === 'paid' ? 'Payment confirmed'
      : s === 'fulfilled' ? 'Packed'
      : s === 'shipped' ? 'On its way'
      : 'Delivered';
  }
}
