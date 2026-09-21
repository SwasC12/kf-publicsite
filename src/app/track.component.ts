import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { doc, getDoc } from 'firebase/firestore';
import { getDb } from './firebase';
import { SeoService } from './seo.service';
import { IconComponent } from './icon.component';
import { OrderStatus } from './models';
import { formatPrice } from './util';

interface StatusDoc { reference: string; status: OrderStatus; total: number; createdAt: number; updatedAt: number; }
const STEPS: OrderStatus[] = ['pending', 'paid', 'fulfilled'];

@Component({
  selector: 'app-track',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  template: `
    <div class="track reveal">
      <h1 class="page-title">Track your order</h1>
      <p class="auth-sub">Enter your order reference (e.g. KF-AB12C) to see its status.</p>
      <form class="track-form" (ngSubmit)="lookup()">
        <input type="text" [(ngModel)]="ref" name="ref" placeholder="KF-XXXXX" autocomplete="off" />
        <button type="submit" class="btn primary" [disabled]="busy() || !ref.trim()">{{ busy() ? 'Checking…' : 'Track' }}</button>
      </form>

      @if (notFound()) { <div class="notice error">No order found with that reference. Check the code and try again.</div> }

      @if (result(); as r) {
        <div class="track-result">
          <div class="track-head">
            <span class="hist-ref">{{ r.reference }}</span>
            <span class="status-pill" [attr.data-status]="r.status">{{ r.status === 'fulfilled' ? 'on its way' : r.status }}</span>
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
        </div>
      }
    </div>
  `,
})
export class TrackComponent {
  ref = '';
  readonly busy = signal(false);
  readonly notFound = signal(false);
  readonly result = signal<StatusDoc | null>(null);
  readonly steps = STEPS;
  price = formatPrice;

  constructor() { inject(SeoService).page('Track order'); }

  async lookup(): Promise<void> {
    const code = this.ref.trim().toUpperCase();
    if (!code) return;
    this.busy.set(true);
    this.notFound.set(false);
    this.result.set(null);
    try {
      const snap = await getDoc(doc(getDb(), 'orderStatus', code));
      if (snap.exists()) this.result.set(snap.data() as StatusDoc);
      else this.notFound.set(true);
    } catch {
      this.notFound.set(true);
    } finally {
      this.busy.set(false);
    }
  }

  stepIndex(s: OrderStatus): number { return STEPS.indexOf(s); }
  label(s: OrderStatus): string { return s === 'pending' ? 'Order received' : s === 'paid' ? 'Payment confirmed' : 'On its way'; }
}
