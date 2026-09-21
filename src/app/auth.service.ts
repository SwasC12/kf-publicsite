import { Injectable, computed, signal } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User,
} from 'firebase/auth';
import { getAuthInstance } from './firebase';

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
