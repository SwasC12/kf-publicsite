import { Injectable, computed, signal } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  updateProfile,
  User,
} from 'firebase/auth';
import { getAuthInstance } from '@core/firebase/firebase';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<User | null>(null);
  readonly ready = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  readonly isLoggedIn = computed(() => !!this.user());

  constructor() {
    onAuthStateChanged(getAuthInstance(), (u) => {
      this.user.set(u);
      this.ready.set(true);
    });
  }

  async signUp(name: string, email: string, password: string): Promise<boolean> {
    return this.run(async () => {
      const cred = await createUserWithEmailAndPassword(getAuthInstance(), email.trim(), password);
      if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
    });
  }

  async signIn(email: string, password: string): Promise<boolean> {
    return this.run(() => signInWithEmailAndPassword(getAuthInstance(), email.trim(), password).then(() => {}));
  }

  /** Send (or resend) the Firebase verification email for the signed-in user. */
  async sendVerificationEmail(): Promise<boolean> {
    const u = this.user();
    if (!u) return false;
    this.busy.set(true);
    this.error.set(null);
    try {
      await sendEmailVerification(u);
      return true;
    } catch {
      this.error.set('Could not send the verification email. Please try again shortly.');
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  /** Re-read the user record (e.g. after clicking the verification link). */
  async reloadUser(): Promise<void> {
    const current = getAuthInstance().currentUser;
    if (!current) return;
    try {
      await current.reload();
      // Bounce the signal so anything watching it re-runs.
      this.user.set(null);
      this.user.set(getAuthInstance().currentUser);
    } catch {
      /* ignore */
    }
  }

  async resetPassword(email: string): Promise<boolean> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const res = await fetch('/api/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.status === 429) {
        this.error.set('Too many reset requests. Please try again later.');
        return false;
      }
      return true;
    } catch {
      this.error.set('Could not send the reset email. Please try again.');
      return false;
    } finally {
      this.busy.set(false);
    }
  }

  async signOut(): Promise<void> {
    await signOut(getAuthInstance());
  }

  private async run(fn: () => Promise<void>): Promise<boolean> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await fn();
      return true;
    } catch (e: any) {
      const c = e?.code ?? '';
      this.error.set(
        c.includes('email-already-in-use') ? 'That email already has an account — sign in instead.'
        : c.includes('weak-password') ? 'Password should be at least 6 characters.'
        : c.includes('invalid-email') ? 'That email address looks invalid.'
        : c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found') ? 'Wrong email or password.'
        : 'Something went wrong. Please try again.',
      );
      return false;
    } finally {
      this.busy.set(false);
    }
  }
}
