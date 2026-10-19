import { Injectable } from '@angular/core';
import { getAuthInstance } from './firebase';

/**
 * Sends the welcome email through the Worker. The Worker verifies the caller's
 * Firebase ID token and only mails the address on that account.
 */
@Injectable({ providedIn: 'root' })
export class EmailService {
  async welcome(to: string, name: string): Promise<void> {
    if (!to) return;
    try {
      const user = getAuthInstance().currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({ type: 'welcome', to, name }),
      });
    } catch {
      /* email is best-effort */
    }
  }
}
