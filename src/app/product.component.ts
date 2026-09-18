import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProductsService } from './products.service';
import { CartService } from './cart.service';
import { IconComponent } from './icon.component';
import { formatPrice } from './util';

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <a class="back-link" routerLink="/"><app-icon name="arrow-left" [size]="16" /> Back to shop</a>

    @if (product(); as p) {
      <div class="product-detail">
        <div class="pd-image">
          @if (p.imageUrl) {
            <img [src]="p.imageUrl" [alt]="p.name" (error)="imgErr($event)" />
          } @else {
            <span class="thumb-fallback"><app-icon name="droplet" [size]="72" /></span>
          }
        </div>
        <div class="pd-info">
          <h1>{{ p.name }}</h1>
          @if (p.size) { <span class="p-size">{{ p.size }}</span> }
          <div class="pd-price">{{ price(p.price) }}</div>
          @if (p.description) { <p class="pd-desc">{{ p.description }}</p> }

          @if (p.inStock) {
            <div class="qty-row">
              <button class="qbtn" (click)="dec()" [disabled]="qty() <= 1"><app-icon name="minus" [size]="16" /></button>
              <span class="qval">{{ qty() }}</span>
              <button class="qbtn" (click)="inc()"><app-icon name="plus" [size]="16" /></button>
            </div>
            <button class="btn primary big" (click)="add(p)">
              <app-icon name="cart" [size]="18" /> Add to cart
            </button>
          } @else {
            <div class="oos-note">Currently sold out</div>
          }
        </div>
      </div>
    } @else if (svc.loading()) {
      <div class="notice">Loading…</div>
    } @else {
      <div class="notice">
        <p>Fragrance not found.</p>
        <a class="btn" routerLink="/">Back to shop</a>
      </div>
    }
  `,
})
export class ProductComponent {
  readonly svc = inject(ProductsService);
  private cart = inject(CartService);
  private route = inject(ActivatedRoute);

  private id = toSignal(this.route.paramMap, { requireSync: true });
  readonly qty = signal(1);
  readonly product = computed(() => {
    const id = this.id()?.get('id');
    return id ? this.svc.products().find((p) => p.id === id) : undefined;
  });

  price = formatPrice;

  inc(): void { this.qty.update((q) => q + 1); }
  dec(): void { this.qty.update((q) => Math.max(1, q - 1)); }

  add(p: ReturnType<ProductComponent['product']>): void {
    if (p) this.cart.add(p, this.qty());
  }

  imgErr(ev: Event): void {
    (ev.target as HTMLImageElement).style.visibility = 'hidden';
  }
}
