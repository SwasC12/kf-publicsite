import { Injectable, effect, inject, signal } from '@angular/core';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDb } from '@core/firebase/firebase';
import { AuthService } from '@core/services/auth.service';
import { Address, CustomerProfile, Order, emptyAddress } from '@core/models';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private auth = inject(AuthService);

  readonly profile = signal<CustomerProfile | null>(null);
  readonly orders = signal<Order[]>([]);
  readonly saving = signal(false);

  constructor() {
    // Load/refresh the profile + order history whenever the signed-in user changes.
    effect(() => {
      const u = this.auth.user();
      this.orders.set([]);
      if (!u) {
        this.profile.set(null);
        return;
      }
      void this.loadProfile(u.uid, u.email ?? '', u.displayName ?? '');
      void this.loadOrders();
    });
  }

  /** Re-fetch the order history (e.g. after returning from checkout). */
  async refresh(): Promise<void> {
    await this.loadOrders();
  }

  private async loadProfile(uid: string, email: string, name: string): Promise<void> {
    try {
      const snap = await getDoc(doc(getDb(), 'customers', uid));
      if (snap.exists()) {
        this.profile.set({ uid, ...(snap.data() as Omit<CustomerProfile, 'uid'>) });
      } else {
        this.profile.set({ uid, name, email, phone: '', billing: emptyAddress(), delivery: emptyAddress(), updatedAt: 0 });
      }
    } catch {
      this.profile.set({ uid, name, email, phone: '', billing: emptyAddress(), delivery: emptyAddress(), updatedAt: 0 });
    }
  }

  /**
   * Order history comes from the Worker, which verifies the signed-in user and
   * also links orders that were placed with the same email before signing in.
   * This avoids trusting (or indexing) the orders collection from the browser.
   */
  private async loadOrders(): Promise<void> {
    const u = this.auth.user();
    if (!u) {
      this.orders.set([]);
      return;
    }
    try {
      const token = await u.getIdToken();
      const res = await fetch('/api/my-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: '{}',
      });
      const data = await res.json().catch(() => ({}));
      const list = Array.isArray(data.orders) ? (data.orders as Order[]) : [];
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      this.orders.set(list);
    } catch {
      /* keep whatever we already have */
    }
  }

  async save(data: { name: string; phone: string; billing: Address; delivery: Address }): Promise<boolean> {
    const u = this.auth.user();
    if (!u) return false;
    this.saving.set(true);
    try {
      const payload: CustomerProfile = {
        uid: u.uid,
        name: data.name,
        email: u.email ?? '',
        phone: data.phone,
        billing: data.billing,
        delivery: data.delivery,
        updatedAt: Date.now(),
      };
      await setDoc(doc(getDb(), 'customers', u.uid), payload);
      this.profile.set(payload);
      return true;
    } catch {
      return false;
    } finally {
      this.saving.set(false);
    }
  }
}
