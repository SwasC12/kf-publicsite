import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from './cart.service';
import { SettingsService } from './settings.service';
import { IconComponent } from './icon.component';
import { formatPrice } from './util';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <h1 class="page-title">Your cart</h1>

    @if (cart.items().length === 0) {
      <div class="notice">
        <app-icon name="cart" [size]="40" />
        <p>Your cart is empty.</p>
        <a class="btn primary" routerLink="/">Browse fragrances</a>
      </div>
    } @else {
      <div class="cart-list">
        @for (i of cart.items(); track i.productId) {
          <div class="cart-row">
            <div class="cart-thumb">
              @if (i.imageUrl) { <img [src]="i.imageUrl" [alt]="i.name" (error)="imgErr($event)" /> }
              @else { <span class="thumb-fallback"><app-icon name="droplet" [size]="28" /></span> }
            </div>
            <div class="cart-info">
              <span class="cart-name">{{ i.name }}</span>
              @if (i.size) { <span class="p-size">{{ i.size }}</span> }
              <span class="cart-price">{{ price(i.price) }}</span>
            </div>
            <div class="qty-row small">
              <button class="qbtn" (click)="cart.setQty(i.productId, i.qty - 1)" [attr.aria-label]="'Decrease quantity of ' + i.name"><app-icon name="minus" [size]="14" /></button>
              <span class="qval">{{ i.qty }}</span>
              <button class="qbtn" (click)="cart.setQty(i.productId, i.qty + 1)" [attr.aria-label]="'Increase quantity of ' + i.name"><app-icon name="plus" [size]="14" /></button>
            </div>
            <div class="cart-line-total">{{ price(i.price * i.qty) }}</div>
            <button class="icon-btn" title="Remove" [attr.aria-label]="'Remove ' + i.name" (click)="cart.remove(i.productId)"><app-icon name="trash" [size]="17" /></button>
          </div>
        }
      </div>

      <div class="cart-summary">
        <div class="summary-total"><span>Total</span><strong>{{ price(cart.total()) }}</strong></div>
        @if (threshold() && cart.total() < threshold()!) {
          <p class="ship-hint">Spend {{ price(threshold()! - cart.total()) }} more for free delivery.</p>
        }
        <a class="btn primary big" routerLink="/checkout">
          Checkout <app-icon name="arrow-right" [size]="18" />
        </a>
        <a class="continue" routerLink="/">Continue shopping</a>
      </div>
    }
  `,
})
export class CartComponent {
  readonly cart = inject(CartService);
  readonly settings = inject(SettingsService);
  readonly threshold = computed(() => this.settings.settings().freeDeliveryThreshold ?? null);
  price = formatPrice;
  imgErr(ev: Event): void { (ev.target as HTMLImageElement).style.visibility = 'hidden'; }
}
