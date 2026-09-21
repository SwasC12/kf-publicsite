import { Component, computed, effect, inject, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProductsService } from './products.service';
import { CartService } from './cart.service';
import { SeoService } from './seo.service';
import { FavoritesService } from './favorites.service';
import { IconComponent } from './icon.component';
import { Product, effectivePrice, isOnSale } from './models';
import { formatPrice, placeholderFor } from './util';

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <a class="back-link" routerLink="/"><app-icon name="arrow-left" [size]="16" /> Back to shop</a>

    @if (product(); as p) {
      <div class="product-detail reveal">
        <div class="pd-gallery">
          <div class="pd-image">
            @if (mainImage(p)) { <img [src]="mainImage(p)" [alt]="p.name" (error)="imgErr($event)" /> }
            @else { <span class="thumb-fallback"><app-icon name="droplet" [size]="72" /></span> }
            @if (onSale(p)) { <span class="sale-badge">Sale</span> }
          </div>
          @if (images(p).length > 1) {
            <div class="pd-thumbs">
              @for (img of images(p); track img; let i = $index) {
                <button class="pd-thumb" [class.on]="i === activeImg()" (click)="activeImg.set(i)">
                  <img [src]="img" [alt]="p.name" (error)="imgErr($event)" />
                </button>
              }
            </div>
          }
        </div>

        <div class="pd-info">
          @if (p.category || p.gender) {
            <div class="pd-tags">
              @if (p.gender) { <span class="pd-tag">{{ p.gender }}</span> }
              @if (p.category) { <span class="pd-tag">{{ p.category }}</span> }
            </div>
          }
          <h1>{{ p.name }}</h1>
          @if (p.inspiredBy) { <p class="pd-inspired">Smells like <strong>{{ p.inspiredBy }}</strong></p> }
          @if (p.size) { <span class="p-size">{{ p.size }}</span> }
          <div class="pd-price">
            @if (onSale(p)) { <span class="was">{{ price(p.price) }}</span> }
            {{ price(eff(p)) }}
          </div>

          @if (p.description) { <p class="pd-desc">{{ p.description }}</p> }

          @if (p.inStock) {
            <div class="qty-row">
              <button class="qbtn" (click)="dec()" [disabled]="qty() <= 1"><app-icon name="minus" [size]="16" /></button>
              <span class="qval">{{ qty() }}</span>
              <button class="qbtn" (click)="inc()"><app-icon name="plus" [size]="16" /></button>
            </div>
            <div class="pd-actions">
              <button class="btn primary big" (click)="add(p)"><app-icon name="cart" [size]="18" /> Add to cart</button>
              <button class="btn big save-btn" [class.on]="fav.has(p.id)" (click)="fav.toggle(p.id)">
                <app-icon name="heart" [size]="18" [filled]="fav.has(p.id)" /> {{ fav.has(p.id) ? 'Saved' : 'Save' }}
              </button>
            </div>
          } @else {
            <div class="oos-note">Currently sold out</div>
            <button class="btn big save-btn" [class.on]="fav.has(p.id)" (click)="fav.toggle(p.id)">
              <app-icon name="heart" [size]="18" [filled]="fav.has(p.id)" /> {{ fav.has(p.id) ? 'Saved' : 'Save' }}
            </button>
          }

          @if (p.notesTop || p.notesHeart || p.notesBase) {
            <div class="notes-block">
              <h3 class="block-title">Fragrance notes</h3>
              @if (p.notesTop) { <p><strong>Top:</strong> {{ p.notesTop }}</p> }
              @if (p.notesHeart) { <p><strong>Heart:</strong> {{ p.notesHeart }}</p> }
              @if (p.notesBase) { <p><strong>Base:</strong> {{ p.notesBase }}</p> }
            </div>
          }

          @if (p.longDescription) {
            <div class="notes-block">
              <h3 class="block-title">About this fragrance</h3>
              <p class="pd-long">{{ p.longDescription }}</p>
            </div>
          }
        </div>
      </div>
    } @else if (svc.loading()) {
      <div class="notice">Loading…</div>
    } @else {
      <div class="notice"><p>Fragrance not found.</p><a class="btn" routerLink="/">Back to shop</a></div>
    }
  `,
})
export class ProductComponent {
  readonly svc = inject(ProductsService);
  readonly fav = inject(FavoritesService);
  private cart = inject(CartService);
  private route = inject(ActivatedRoute);

  private id = toSignal(this.route.paramMap, { requireSync: true });
  readonly qty = signal(1);
  readonly activeImg = signal(0);
  readonly product = computed(() => {
    const id = this.id()?.get('id');
    return id ? this.svc.products().find((p) => p.id === id) : undefined;
  });

  private seo = inject(SeoService);

  constructor() {
    effect(() => {
      const p = this.product();
      if (p) this.seo.product(p);
    });
  }

  price = formatPrice;
  eff = effectivePrice;
  onSale = isOnSale;

  images(p: Product): string[] {
    const imgs = [p.imageUrl, ...(p.gallery ?? [])].filter((x): x is string => !!x);
    return imgs.length ? imgs : [placeholderFor(p.gender)];
  }
  mainImage(p: Product): string | undefined {
    return this.images(p)[this.activeImg()] ?? this.images(p)[0];
  }

  inc(): void { this.qty.update((q) => q + 1); }
  dec(): void { this.qty.update((q) => Math.max(1, q - 1)); }
  add(p: Product): void { this.cart.add(p, this.qty()); }
  imgErr(ev: Event): void { (ev.target as HTMLImageElement).style.visibility = 'hidden'; }
}
