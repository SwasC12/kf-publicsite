import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductsService } from './products.service';
import { CartService } from './cart.service';
import { ContentService } from './content.service';
import { SeoService } from './seo.service';
import { FavoritesService } from './favorites.service';
import { IconComponent } from './icon.component';
import { Product, effectivePrice, isOnSale } from './models';
import { formatPrice, productImage } from './util';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [RouterLink, IconComponent, NgTemplateOutlet, FormsModule],
  template: `
    <!-- Hero -->
    <section class="hero" [class.has-image]="!!hero().heroImageUrl"
             [style.background-image]="hero().heroImageUrl ? 'url(' + hero().heroImageUrl + ')' : null">
      <div class="hero-inner">
        <img class="hero-mark" src="logo-mark.png" alt="Kauā Fragrances" />
        <h1>{{ hero().heroTitle || 'KAUĀ FRAGRANCES' }}</h1>
        <p class="tagline">{{ hero().heroSubtitle || '"one spray to last the day"' }}</p>
        @if (hero().heroCtaText) {
          <button class="btn primary big hero-cta" (click)="cta(hero().heroCtaLink)">{{ hero().heroCtaText }}</button>
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
              @if (b.ctaText) { <button class="btn light" (click)="cta(b.ctaLink)">{{ b.ctaText }}</button> }
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
        <div class="toolbar-right">
          <input class="search" type="search" placeholder="Search name or 'smells like'…"
                 [value]="search()" (input)="search.set($any($event.target).value)" />
          <select class="sort-select" [ngModel]="sort()" (ngModelChange)="sort.set($event)" aria-label="Sort">
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </div>

      @if (categories().length > 1 || genders().length > 1) {
        <div class="chips">
          <button class="chip" [class.active]="category() === 'all' && gender() === 'all'" (click)="category.set('all'); gender.set('all')">All</button>
          @for (g of genders(); track g) {
            <button class="chip" [class.active]="gender() === g" (click)="gender.set(gender() === g ? 'all' : g)">{{ g }}</button>
          }
          @for (c of categories(); track c) {
            <button class="chip" [class.active]="category() === c" (click)="category.set(category() === c ? 'all' : c)">{{ c }}</button>
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
        <button class="fav-btn" [class.on]="fav.has(p.id)" (click)="fav.toggle(p.id)"
                [attr.aria-label]="fav.has(p.id) ? 'Remove from saved' : 'Save'">
          <app-icon name="heart" [size]="18" [filled]="fav.has(p.id)" />
        </button>
        <a class="thumb" [routerLink]="['/product', p.id]">
          <img [src]="img(p)" [alt]="p.name" loading="lazy" (error)="imgErr($event)" />
          @if (onSale(p)) { <span class="sale-badge">Sale</span> }
          @if (!p.inStock) { <span class="oos-badge">Sold out</span> }
        </a>
        <div class="card-body">
          <a class="p-name" [routerLink]="['/product', p.id]">{{ p.name }}</a>
          @if (p.inspiredBy) { <span class="p-inspired">Smells like {{ p.inspiredBy }}</span> }
          @if (p.size) { <span class="p-size">{{ p.size }}</span> }
          <div class="p-foot">
            <span class="p-price">
              @if (onSale(p)) { <span class="was">{{ price(p.price) }}</span> }
              {{ price(eff(p)) }}
            </span>
            @if (p.inStock) {
              @if (cart.qtyOf(p.id) > 0) {
                <div class="qty-row small card-qty">
                  <button class="qbtn" (click)="cart.setQty(p.id, cart.qtyOf(p.id) - 1)" aria-label="Less"><app-icon name="minus" [size]="14" /></button>
                  <span class="qval">{{ cart.qtyOf(p.id) }}</span>
                  <button class="qbtn" (click)="cart.setQty(p.id, cart.qtyOf(p.id) + 1)" aria-label="More"><app-icon name="plus" [size]="14" /></button>
                </div>
              } @else {
                <button class="add-btn" (click)="add(p)" title="Add to cart"><app-icon name="plus" [size]="16" /> Add</button>
              }
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
  readonly fav = inject(FavoritesService);
  readonly cart = inject(CartService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly search = signal('');
  readonly category = signal<'all' | string>('all');
  readonly gender = signal<'all' | string>('all');
  readonly sort = signal<'featured' | 'newest' | 'price-asc' | 'price-desc' | 'name'>('featured');
  readonly slide = signal(0);
  private timer: any;

  readonly hero = computed(() => this.content.content());
  readonly banners = computed(() => this.content.activeBanners());

  readonly categories = computed(() => {
    const set = new Set<string>();
    for (const p of this.svc.products()) if (p.category) set.add(p.category);
    return [...set].sort();
  });

  readonly genders = computed(() => {
    const set = new Set<string>();
    for (const p of this.svc.products()) if (p.gender) set.add(p.gender);
    return [...set].sort();
  });

  readonly featured = computed(() => this.svc.products().filter((p) => p.featured));

  readonly filtered = computed<Product[]>(() => {
    const q = this.search().trim().toLowerCase();
    const cat = this.category();
    const gen = this.gender();
    const list = this.svc.products()
      .filter((p) => (cat === 'all' ? true : p.category === cat))
      .filter((p) => (gen === 'all' ? true : p.gender === gen || p.gender === 'Unisex'))
      .filter((p) => (q
        ? p.name.toLowerCase().includes(q) || (p.inspiredBy ?? '').toLowerCase().includes(q)
        : true));
    const s = this.sort();
    const sorted = [...list];
    switch (s) {
      case 'price-asc': sorted.sort((a, b) => effectivePrice(a) - effectivePrice(b)); break;
      case 'price-desc': sorted.sort((a, b) => effectivePrice(b) - effectivePrice(a)); break;
      case 'name': sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'newest': sorted.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); break;
      case 'featured': sorted.sort((a, b) => Number(!!b.featured) - Number(!!a.featured)); break;
    }
    return sorted;
  });

  price = formatPrice;
  eff = effectivePrice;
  onSale = isOnSale;
  img = productImage;

  private seo = inject(SeoService);

  constructor() {
    this.seo.page('Kauā Fragrances');
    this.route.queryParamMap.subscribe((q) => {
      const g = q.get('gender');
      this.gender.set(g ? g : 'all');
      if (g) setTimeout(() => this.scrollToShop(), 60);
    });
    this.timer = setInterval(() => {
      const n = this.banners().length;
      if (n > 1) this.slide.update((i) => (i + 1) % n);
    }, 5000);
  }

  ngOnDestroy(): void { clearInterval(this.timer); }

  prev(): void { const n = this.banners().length; this.slide.update((i) => (i - 1 + n) % n); }
  next(): void { const n = this.banners().length; this.slide.update((i) => (i + 1) % n); }

  add(p: Product): void { this.cart.add(p); }

  cta(link?: string): void {
    const l = (link || '').trim();
    if (!l || l.startsWith('#')) { this.scrollToShop(); return; }
    if (l.startsWith('http')) { window.open(l, '_blank'); return; }
    this.router.navigateByUrl(l);
  }
  scrollToShop(): void { document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }); }

  imgErr(ev: Event): void { (ev.target as HTMLImageElement).style.visibility = 'hidden'; }
}
