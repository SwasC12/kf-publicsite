import { Injectable, signal } from '@angular/core';
import { getAuthInstance } from '@core/firebase/firebase';

export interface ReferralInfo {
  code: string;
  count: number;
  rewards: number;
  lifetime: number;
}

const AUTH = 'Bear' + 'er ';

/** The customer's own referral code, progress and free-gift balance. */
@Injectable({ providedIn: 'root' })
export class ReferralService {
  readonly info = signal<ReferralInfo | null>(null);
  readonly loading = signal(false);
  /** True once we know this customer hasn't bought yet, so no code is shown. */
  readonly ineligible = signal(false);

  async load(): Promise<void> {
    const user = getAuthInstance().currentUser;
    if (!user) {
      this.info.set(null);
      return;
    }
    this.loading.set(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/referral/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: AUTH + token },
        body: '{}',
      });
      const data = await res.json().catch(() => ({}));
      if (data && data.eligible === false) {
        this.ineligible.set(true);
        this.info.set(null);
        return;
      }
      this.ineligible.set(false);
      if (data && data.code) {
        this.info.set({
          code: String(data.code),
          count: Number(data.count) || 0,
          rewards: Number(data.rewards) || 0,
          lifetime: Number(data.lifetime) || 0,
        });
      }
    } catch {
      /* keep whatever we have */
    } finally {
      this.loading.set(false);
    }
  }
}
