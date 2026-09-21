import { Injectable, effect, inject, signal } from '@angular/core';
import { doc, getDoc, setDoc, collection, query, where, orderBy, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { getDb } from './firebase';
import { AuthService } from './auth.service';
import { Address, CustomerProfile, Order, emptyAddress } from './models';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private auth = inject(AuthService);

  readonly profile = signal<CustomerProfile | null>(null);
  readonly orders = signal<Order[]>([]);
  readonly saving = signal(false);
  private ordersUnsub?: Unsubscribe;

  constructor() {
    // Load/refresh the profile + order history whenever the signed-in user changes.
    effect(() => {
      const u = this.auth.user();
      this.ordersUnsub?.();
      this.ordersUnsub = undefined;
      this.orders.set([]);
      if (!u) {
        this.profile.set(null);
        return;
      }
      void this.loadProfile(u.uid, u.email ?? '', u.displayName ?? '');
      this.watchOrders(u.uid);
    });
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

  private watchOrders(uid: string): void {
    try {
      this.ordersUnsub = onSnapshot(
        query(collection(getDb(), 'orders'), where('uid', '==', uid), orderBy('createdAt', 'desc')),
        (snap) => this.orders.set(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, 'id'>) }))),
        () => this.orders.set([]),
      );
    } catch {
      /* ignore */
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
