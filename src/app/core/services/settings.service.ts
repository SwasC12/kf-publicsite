import { Injectable, signal } from '@angular/core';
import { doc, onSnapshot } from 'firebase/firestore';
import { getDb } from '@core/firebase/firebase';
import { StoreSettings } from '@core/models';
import { setPlaceholderOverrides } from '@core/utils';

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

  constructor() {
    try {
      onSnapshot(
        doc(getDb(), 'settings', 'store'),
        (snap) => {
          if (snap.exists()) {
            const s = { ...DEFAULTS, ...(snap.data() as StoreSettings) };
            this.settings.set(s);
            setPlaceholderOverrides(
              s.placeholderMen, s.placeholderWomen,
              s.placeholderMen30, s.placeholderMen50, s.placeholderMen100,
              s.placeholderWomen30, s.placeholderWomen50, s.placeholderWomen100,
            );
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
