import { Component, effect, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from './auth.service';
import { CustomerService } from './customer.service';
import { IconComponent } from './icon.component';
import { Address, emptyAddress } from './models';
import { formatPrice } from './util';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, NgTemplateOutlet],
  template: `
    @if (!auth.isLoggedIn()) {
      <div class="auth-card reveal">
        <h1 class="page-title">{{ mode() === 'in' ? 'Sign in' : 'Create account' }}</h1>
        <p class="auth-sub">Save your details for faster checkout and track your orders.</p>
        <form (ngSubmit)="submit()">
          @if (mode() === 'up') {
            <label>Full name<input type="text" name="n" [(ngModel)]="name" required autocomplete="name" /></label>
          }
          <label>Email<input type="email" name="e" [(ngModel)]="email" required autocomplete="email" /></label>
          <label>Password<input type="password" name="p" [(ngModel)]="password" required autocomplete="{{ mode()==='in' ? 'current-password' : 'new-password' }}" /></label>
          @if (auth.error()) { <p class="form-error">{{ auth.error() }}</p> }
          <button type="submit" class="btn primary big" [disabled]="auth.busy()">
            {{ auth.busy() ? 'Please wait…' : (mode() === 'in' ? 'Sign in' : 'Create account') }}
          </button>
        </form>
        <p class="auth-switch">
          {{ mode() === 'in' ? "New here?" : 'Already have an account?' }}
          <button class="linkbtn" (click)="toggle()">{{ mode() === 'in' ? 'Create an account' : 'Sign in' }}</button>
        </p>
      </div>
    } @else {
      <div class="account reveal">
        <div class="account-head">
          <h1 class="page-title">My account</h1>
          <button class="btn" (click)="signOut()"><app-icon name="log-out" [size]="16" /> Sign out</button>
        </div>
        <p class="auth-sub">Signed in as {{ auth.user()?.email }}</p>

        <form class="profile-form" (ngSubmit)="save()">
          <h2 class="block-title">Contact</h2>
          <div class="row">
            <label>Name<input type="text" name="pn" [(ngModel)]="pName" /></label>
            <label>Phone<input type="tel" name="pp" [(ngModel)]="pPhone" /></label>
          </div>

          <h2 class="block-title">Billing address</h2>
          <ng-container *ngTemplateOutlet="addr; context: { $implicit: billing, k: 'b' }" />

          <h2 class="block-title">Delivery address
            <label class="chk sameas"><input type="checkbox" [(ngModel)]="sameAsBilling" name="same" (ngModelChange)="onSame()" /> same as billing</label>
          </h2>
          @if (!sameAsBilling) {
            <ng-container *ngTemplateOutlet="addr; context: { $implicit: delivery, k: 'd' }" />
          }

          @if (saved()) { <p class="form-ok">Saved.</p> }
          <button type="submit" class="btn primary" [disabled]="cust.saving()">{{ cust.saving() ? 'Saving…' : 'Save details' }}</button>
        </form>

        <h2 class="block-title">Order history</h2>
        @if (cust.orders().length === 0) {
          <div class="notice"><app-icon name="package" [size]="36" /><p>No orders yet. <a routerLink="/">Start shopping</a>.</p></div>
        } @else {
          <div class="order-hist">
            @for (o of cust.orders(); track o.id) {
              <div class="hist-row">
                <div><span class="hist-ref">{{ o.reference }}</span><span class="hist-date">{{ date(o.createdAt) }}</span></div>
                <span class="status-pill" [attr.data-status]="o.status">{{ o.status }}</span>
                <span class="hist-total">{{ price(o.total) }}</span>
              </div>
            }
          </div>
        }
      </div>
    }

    <ng-template #addr let-a let-k="k">
      <label>Address line 1<input type="text" [ngModel]="a.line1" (ngModelChange)="a.line1=$event" [name]="k+'l1'" /></label>
      <label>Address line 2<input type="text" [ngModel]="a.line2" (ngModelChange)="a.line2=$event" [name]="k+'l2'" /></label>
      <div class="row">
        <label>City<input type="text" [ngModel]="a.city" (ngModelChange)="a.city=$event" [name]="k+'c'" /></label>
        <label>Province<input type="text" [ngModel]="a.province" (ngModelChange)="a.province=$event" [name]="k+'p'" /></label>
      </div>
      <div class="row">
        <label>Postal code<input type="text" [ngModel]="a.postalCode" (ngModelChange)="a.postalCode=$event" [name]="k+'pc'" /></label>
        <label>Country<input type="text" [ngModel]="a.country" (ngModelChange)="a.country=$event" [name]="k+'co'" /></label>
      </div>
    </ng-template>
  `,
})
export class AccountComponent {
  readonly auth = inject(AuthService);
  readonly cust = inject(CustomerService);

  readonly mode = signal<'in' | 'up'>('in');
  name = ''; email = ''; password = '';

  pName = ''; pPhone = '';
  billing: Address = emptyAddress();
  delivery: Address = emptyAddress();
  sameAsBilling = false;
  readonly saved = signal(false);

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

  toggle(): void { this.mode.update((m) => (m === 'in' ? 'up' : 'in')); this.auth.error.set(null); }

  async submit(): Promise<void> {
    if (this.mode() === 'in') await this.auth.signIn(this.email, this.password);
    else await this.auth.signUp(this.name, this.email, this.password);
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
