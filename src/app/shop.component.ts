import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductsService } from './products.service';
import { CartService } from './cart.service';
import { IconComponent } from './icon.component';
import { Product } from './models';
import { formatPrice } from './util';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <section class="hero">
      <img class="hero-mark" src="logo-mark.png" alt="Kauā Fragrances" />
      <h1>Kauā Fragrances</h1>
      <p class="tagline">"one spray to last the day"</p>
      <p class="hero-sub">Inspired-by fragrance oils — long-lasting, affordable, beautifully made.</p>
    </section>

    <div class="shop-toolbar">
      <input class="search" type="search" placeholder="Search fragrances…"
             [value]="search()" (input)="search.set($any($event.target).value)" />
      <span class="result-count">{{ filtered().length }} fragrance{{ filtered().length === 1 ? '' : 's' }}</span>
    </div>

    @if (svc.loading()) {
      <div class="grid">
        @for (s of [1,2,3,4,5,6,7,8]; track s) {
          <div class="card skeleton"><div class="thumb sk"></div><div class="sk-line"></div><div class="sk-line short"></div></div>
        }
      </div>
    } @else if (svc.error()) {
      <div class="notice">{{ svc.error() }}</div>
    } @else if (filtered().length === 0) {
      <div class="notice">
        <app-icon name="bag" [size]="40" />
        <p>{{ search() ? 'No fragrances match your search.' : 'No fragrances available right now — check back soon.' }}</p>
      </div>
    } @else {
      <div class="grid">
        @for (p of filtered(); track p.id) {
          <article class="card">
            <a class="thumb" [routerLink]="['/product', p.id]">
              @if (p.imageUrl) {
                <img [src]="p.imageUrl" [alt]="p.name" loading="lazy" (error)="imgErr($event)" />
              } @else {
                <span class="thumb-fallback"><app-icon name="droplet" [size]="40" /></span>
              }
              @if (!p.inStock) { <span class="oos-badge">Sold out</span> }
            </a>
            <div class="card-body">
              <a class="p-name" [routerLink]="['/product', p.id]">{{ p.name }}</a>
              @if (p.size) { <span class="p-size">{{ p.size }}</span> }
              <div class="p-foot">
                <span class="p-price">{{ price(p.price) }}</span>
                @if (p.inStock) {
                  <button class="add-btn" (click)="add(p)" title="Add to cart">
                    <app-icon name="plus" [size]="16" /> Add
                  </button>
                } @else {
                  <button class="add-btn disabled" disabled>Sold out</button>
                }
              </div>
            </div>
          </article>
        }
      </div>
    }
  `,
})
export class ShopComponent {
  readonly svc = inject(ProductsService);
  private cart = inject(CartService);

  readonly search = signal('');
  readonly filtered = computed<Product[]>(() => {
    const q = this.search().trim().toLowerCase();
    const list = this.svc.products();
    return q ? list.filter((p) => p.name.toLowerCase().includes(q)) : list;
  });

  price = formatPrice;

  add(p: Product): void {
    this.cart.add(p);
  }

  imgErr(ev: Event): void {
    (ev.target as HTMLImageElement).style.visibility = 'hidden';
  }
}
