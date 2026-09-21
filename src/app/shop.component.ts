import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductsService } from './products.service';
import { CartService } from './cart.service';
import { ContentService } from './content.service';
import { IconComponent } from './icon.component';
import { Product, effectivePrice, isOnSale } from './models';
import { formatPrice } from './util';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [RouterLink, IconComponent, NgTemplateOutlet],
  template: `
    <!-- Hero -->
    <section class="hero" [class.has-image]="!!hero().heroImageUrl"
             [style.background-image]="hero().heroImageUrl ? 'url(' + hero().heroImageUrl + ')' : null">
      <div class="hero-inner">
        <img class="hero-mark" src="logo-mark.png" alt="Kauā Fragrances" />
        <h1>{{ hero().heroTitle || 'KAUĀ FRAGRANCES' }}</h1>
        <p class="tagline">{{ hero().heroSubtitle || '"one spray to last the day"' }}</p>
        @if (hero().heroCtaText) {
          <a class="btn primary big hero-cta" [href]="hero().heroCtaLink || '#shop'">{{ hero().heroCtaText }}</a>
        }
      </div>
    </section>

    <!-- Promo carousel -->
    @if (banners().length) {
      <section class="carousel">
        @for (b of banners(); track b.id; let i = $index) {
          <div class="slide" [class.active]="i === slide()"
               [style.background-image]="b.imageUrl ? 'url(' + b.imageUrl + ')' : null">
            <div class="slide-body">
              <h2>{{ b.title }}</h2>
              @if (b.subtitle) { <p>{{ b.subtitle }}</p> }
              @if (b.ctaText) { <a class="btn light" [href]="b.ctaLink || '#shop'">{{ b.ctaText }}</a> }
            </div>
          </div>
        }
        @if (banners().length > 1) {
          <button class="car-nav prev" (click)="prev()" aria-label="Previous"><app-icon name="chevron-left" [size]="22" /></button>
          <button class="car-nav next" (click)="next()" aria-label="Next"><app-icon name="chevron-right" [size]="22" /></button>
          <div class="dots">
            @for (b of banners(); track b.id; let i = $index) {
              <button class="dot" [class.on]="i === slide()" (click)="slide.set(i)" aria-label="Slide"></button>
            }
          </div>
        }
      </section>
    }

    <!-- Featured -->
    @if (featured().length) {
      <section class="featured reveal">
        <h2 class="section-title">{{ content.content().featuredTitle || 'Featured' }}</h2>
        <div class="grid">
          @for (p of featured(); track p.id) { <ng-container *ngTemplateOutlet="card; context: { $implicit: p }" /> }
        </div>
      </section>
    }

    <!-- Shop -->
    <section id="shop" class="shop-section reveal">
      <div class="shop-toolbar">
        <h2 class="section-title">Shop all</h2>
        <input class="search" type="search" placeholder="Search fragrances…"
               [value]="search()" (input)="search.set($any($event.target).value)" />
      </div>

      @if (categories().length > 1) {
        <div class="chips">
          <button class="chip" [class.active]="category() === 'all'" (click)="category.set('all')">All</button>
          @for (c of categories(); track c) {
            <button class="chip" [class.active]="category() === c" (click)="category.set(c)">{{ c }}</button>
          }
        </div>
      }

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
          <p>{{ search() || category() !== 'all' ? 'No fragrances match.' : 'No fragrances available right now — check back soon.' }}</p>
        </div>
      } @else {
        <div class="grid">
          @for (p of filtered(); track p.id) { <ng-container *ngTemplateOutlet="card; context: { $implicit: p }" /> }
        </div>
      }
    </section>

    <!-- Reusable product card -->
    <ng-template #card let-p>
      <article class="card">
        <a class="thumb" [routerLink]="['/product', p.id]">
          @if (p.imageUrl) { <img [src]="p.imageUrl" [alt]="p.name" loading="lazy" (error)="imgErr($event)" /> }
          @else { <span class="thumb-fallback"><app-icon name="droplet" [size]="40" /></span> }
          @if (onSale(p)) { <span class="sale-badge">Sale</span> }
          @if (!p.inStock) { <span class="oos-badge">Sold out</span> }
        </a>
        <div class="card-body">
          <a class="p-name" [routerLink]="['/product', p.id]">{{ p.name }}</a>
          @if (p.size) { <span class="p-size">{{ p.size }}</span> }
          <div class="p-foot">
            <span class="p-price">
              @if (onSale(p)) { <span class="was">{{ price(p.price) }}</span> }
              {{ price(eff(p)) }}
            </span>
            @if (p.inStock) {
              <button class="add-btn" (click)="add(p)" title="Add to cart"><app-icon name="plus" [size]="16" /> Add</button>
            } @else { <button class="add-btn disabled" disabled>Sold out</button> }
          </div>
        </div>
      </article>
    </ng-template>
  `,
})
export class ShopComponent implements OnDestroy {
  readonly svc = inject(ProductsService);
  readonly content = inject(ContentService);
  private cart = inject(CartService);

  readonly search = signal('');
  readonly category = signal<'all' | string>('all');
  readonly slide = signal(0);
  private timer: any;

  readonly hero = computed(() => this.content.content());
  readonly banners = computed(() => this.content.activeBanners());

  readonly categories = computed(() => {
    const set = new Set<string>();
    for (const p of this.svc.products()) if (p.category) set.add(p.category);
    return [...set].sort();
  });

  readonly featured = computed(() => this.svc.products().filter((p) => p.featured));

  readonly filtered = computed<Product[]>(() => {
    const q = this.search().trim().toLowerCase();
    const cat = this.category();
    return this.svc.products()
      .filter((p) => (cat === 'all' ? true : p.category === cat))
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true));
  });

  price = formatPrice;
  eff = effectivePrice;
  onSale = isOnSale;

  constructor() {
    this.timer = setInterval(() => {
      const n = this.banners().length;
      if (n > 1) this.slide.update((i) => (i + 1) % n);
    }, 5000);
  }

  ngOnDestroy(): void { clearInterval(this.timer); }

  prev(): void { const n = this.banners().length; this.slide.update((i) => (i - 1 + n) % n); }
  next(): void { const n = this.banners().length; this.slide.update((i) => (i + 1) % n); }

  add(p: Product): void { this.cart.add(p); }
  imgErr(ev: Event): void { (ev.target as HTMLImageElement).style.visibility = 'hidden'; }
}
