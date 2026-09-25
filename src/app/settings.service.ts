import { Injectable, computed, signal } from '@angular/core';
import { doc, onSnapshot } from 'firebase/firestore';
import { getDb } from './firebase';
import { StoreSettings } from './models';
import { banking } from './banking.config';
import { setPlaceholderOverrides } from './util';

const DEFAULTS: StoreSettings = {
  storeOpen: true,
  deliveryEnabled: true,
  collectionEnabled: true,
  deliveryFee: 60,
  freeDeliveryThreshold: 500,
  collectionNote: 'Collection details will be arranged after your order.',
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly settings = signal<StoreSettings>(DEFAULTS);

  /** Banking details for the confirmation page — admin settings win, else banking.config. */
  readonly bankingDetails = computed(() => {
    const s = this.settings();
    return {
      accountName: s.bankAccountName || banking.accountName,
      bank: s.bankName || banking.bank,
      accountNumber: s.bankAccountNumber || banking.accountNumber,
      branchCode: s.bankBranchCode || banking.branchCode,
      accountType: s.bankAccountType || banking.accountType,
      contactEmail: s.contactEmail || banking.contactEmail,
      contactPhone: s.contactPhone || banking.contactPhone,
    };
  });

  constructor() {
    try {
      onSnapshot(
        doc(getDb(), 'settings', 'store'),
        (snap) => {
          if (snap.exists()) {
            const s = { ...DEFAULTS, ...(snap.data() as StoreSettings) };
            this.settings.set(s);
            setPlaceholderOverrides(s.placeholderMen, s.placeholderWomen);
          }
        },
        () => {},
      );
    } catch {
      /* keep defaults */
    }
  }

  /** Delivery fee for a given subtotal (0 if free threshold met). */
  deliveryFeeFor(subtotal: number): number {
    const s = this.settings();
    const fee = s.deliveryFee ?? 0;
    const threshold = s.freeDeliveryThreshold ?? null;
    if (threshold != null && subtotal >= threshold) return 0;
    return fee;
  }
}
