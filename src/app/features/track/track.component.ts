import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SeoService } from '@core/services/seo.service';
import { IconComponent } from '@shared/components/icon/icon.component';
import { OrderStatus } from '@core/models';
import { formatPrice } from '@core/utils';

interface StatusDoc { reference: string; status: OrderStatus; total: number; createdAt: number; updatedAt: number; courier?: string; trackingNumber?: string; }
const STEPS: OrderStatus[] = ['pending', 'paid', 'fulfilled', 'shipped', 'delivered'];

@Component({
  selector: 'app-track',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  templateUrl: './track.component.html',
  styleUrl: './track.component.scss',
})
export class TrackComponent {
  ref = '';
  email = '';
  readonly busy = signal(false);
  readonly notFound = signal(false);
  readonly result = signal<StatusDoc | null>(null);
  readonly steps = STEPS;
  price = formatPrice;

  constructor() {
    inject(SeoService).page('Track order');
    // Deep link from the account page: /track?ref=KF-XXXXX&email=...
    const params = inject(ActivatedRoute).snapshot.queryParamMap;
    this.ref = (params.get('ref') || '').toUpperCase();
    this.email = params.get('email') || '';
    if (this.ref && this.email) void this.lookup();
  }

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
