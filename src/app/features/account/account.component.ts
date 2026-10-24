import { Component, effect, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { CustomerService } from '@core/services/customer.service';
import { EmailService } from '@core/services/email.service';
import { IconComponent } from '@shared/components/icon/icon.component';
import { Address, emptyAddress } from '@core/models';
import { formatPrice } from '@core/utils';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, NgTemplateOutlet],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
})
export class AccountComponent {
  readonly auth = inject(AuthService);
  readonly cust = inject(CustomerService);
  private emailSvc = inject(EmailService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly mode = signal<'in' | 'up'>('in');
  readonly showPw = signal(false);
  name = ''; email = ''; password = '';

  pName = ''; pPhone = '';
  billing: Address = emptyAddress();
  delivery: Address = emptyAddress();
  sameAsBilling = false;
  readonly saved = signal(false);
  readonly resetSent = signal(false);

  price = formatPrice;

  constructor() {
    effect(() => {
      const p = this.cust.profile();
      if (p) {
        this.pName = p.name; this.pPhone = p.phone;
        this.billing = { ...p.billing };
        this.delivery = { ...p.delivery };
        this.sameAsBilling = JSON.stringify(p.billing) === JSON.stringify(p.delivery);
      }
    });
  }

  toggle(): void {
    this.mode.update((m) => (m === 'in' ? 'up' : 'in'));
    this.auth.error.set(null);
    this.resetSent.set(false);
  }

  async forgot(): Promise<void> {
    if (!this.email.trim()) {
      this.auth.error.set('Enter your email address first.');
      return;
    }
    const ok = await this.auth.resetPassword(this.email);
    if (ok) this.resetSent.set(true);
  }

  async submit(): Promise<void> {
    if (this.mode() === 'in') {
      const ok = await this.auth.signIn(this.email, this.password);
      if (ok) this.afterAuth();
    } else {
      const ok = await this.auth.signUp(this.name, this.email, this.password);
      if (ok) {
        this.emailSvc.welcome(this.email.trim(), this.name.trim());
        this.afterAuth();
      }
    }
  }

  private afterAuth(): void {
    const back = this.route.snapshot.queryParamMap.get('return');
    if (back && back.startsWith('/')) this.router.navigateByUrl(back);
  }

  onSame(): void { if (this.sameAsBilling) this.delivery = { ...this.billing }; }

  async save(): Promise<void> {
    if (this.sameAsBilling) this.delivery = { ...this.billing };
    const ok = await this.cust.save({ name: this.pName, phone: this.pPhone, billing: this.billing, delivery: this.delivery });
    if (ok) { this.saved.set(true); setTimeout(() => this.saved.set(false), 2500); }
  }

  async signOut(): Promise<void> { await this.auth.signOut(); }
  date(ms: number): string { return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
}
