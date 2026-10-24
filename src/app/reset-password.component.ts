import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SeoService } from './seo.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-card reveal">
      <h1 class="page-title">Choose a new password</h1>
      @if (!token) {
        <p class="form-error">This reset link is invalid or has expired.</p>
        <a class="btn primary big" routerLink="/account">Back to sign in</a>
      } @else if (done()) {
        <p class="form-ok">Your password has been updated. You can now sign in.</p>
        <a class="btn primary big" routerLink="/account">Sign in</a>
      } @else {
        <p class="auth-sub">Choose a password of at least 8 characters.</p>
        <form (ngSubmit)="submit()">
          <label>New password
            <input type="password" name="pw" [(ngModel)]="password" required autocomplete="new-password" />
          </label>
          <label>Confirm password
            <input type="password" name="pw2" [(ngModel)]="confirm" required autocomplete="new-password" />
          </label>
          @if (error()) { <p class="form-error">{{ error() }}</p> }
          <button type="submit" class="btn primary big" [disabled]="busy()">
            {{ busy() ? 'Updating…' : 'Update password' }}
          </button>
        </form>
      }
    </div>
  `,
})
export class ResetPasswordComponent {
  private route = inject(ActivatedRoute);
  readonly token = this.route.snapshot.queryParamMap.get('token') || '';
  password = '';
  confirm = '';
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly done = signal(false);

  constructor() { inject(SeoService).page('Reset password'); }

  async submit(): Promise<void> {
    if (this.busy()) return;
    this.error.set(null);
    if (this.password.length < 8) {
      this.error.set('Choose a password of at least 8 characters.');
      return;
    }
    if (this.password !== this.confirm) {
      this.error.set('The passwords do not match.');
      return;
    }
    this.busy.set(true);
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: this.token, password: this.password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        this.error.set(data.error || 'Could not reset the password. Please request a new link.');
        return;
      }
      this.done.set(true);
    } catch {
      this.error.set('Could not reach the shop. Check your connection and try again.');
    } finally {
      this.busy.set(false);
    }
  }
}
