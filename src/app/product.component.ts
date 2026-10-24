import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { addDoc, collection } from 'firebase/firestore';
import { getDb } from './firebase';
import { ProductsService } from './products.service';
import { CartService } from './cart.service';
import { SeoService } from './seo.service';
import { FavoritesService } from './favorites.service';
import { ReviewsService } from './reviews.service';
import { IconComponent } from './icon.component';
import { Product, ProductSizeKey, effectivePrice, isOnSale } from './models';
import { formatPrice, optimizedImage, placeholderFor, isCustomImage, productImage, sizeOptions, sizeEffectivePrice, sizeOnSale, sizeAvailable, fromPrice } from './util';

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [RouterLink, IconComponent, FormsModule],
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
          @if (p.inspiredBy) {
            <p class="pd-inspired">Smells like <strong>{{ p.inspiredBy }}</strong></p>
            <p class="pd-disclaimer">Our own interpretation — not affiliated with the original brand.</p>
          }
          @if (sizes().length > 1) {
            <div class="size-picker" role="group" aria-label="Select size">
              @for (o of sizes(); track o.key) {
                <button type="button" class="size-chip" [class.active]="selectedSizeKey() === o.key"
                        [disabled]="!available(o.size)" (click)="selectSize(o.key)">
                  <span>{{ o.size.size }}</span>
                  <em>{{ price(effSize(o.size)) }}</em>
                </button>
              }
            </div>
          }

          @if ((p.ratingCount || 0) > 0) {
            <div class="rating-row">
              <span class="stars">
                @for (s of [1,2,3,4,5]; track s) { <app-icon name="star" [size]="16" [filled]="s <= avgRounded(p)" /> }
              </span>
              <span class="rating-meta">{{ avg(p).toFixed(1) }} ({{ p.ratingCount }})</span>
            </div>
          }

          @if (selectedSize(); as sz) {
            <div class="pd-price">
              @if (saleSize(sz)) { <span class="was">{{ price(sz.price) }}</span> }
              {{ price(effSize(sz)) }}
            </div>

            @if (sz.inStock && sz.stockQty != null && sz.stockQty > 0 && sz.stockQty <= 5) {
              <p class="stock-low"><app-icon name="droplet" [size]="14" /> Only {{ sz.stockQty }} left</p>
            }

            @if (p.description) { <p class="pd-desc">{{ p.description }}</p> }

            @if (available(sz)) {
              <div class="qty-row">
                <button class="qbtn" (click)="dec()" [disabled]="qty() <= 1"><app-icon name="minus" [size]="16" /></button>
                <span class="qval">{{ qty() }}</span>
                <button class="qbtn" (click)="inc()" [disabled]="sz.stockQty != null && qty() >= sz.stockQty"><app-icon name="plus" [size]="16" /></button>
              </div>
              <div class="pd-actions">
                <button class="btn primary big" (click)="add(p)"><app-icon name="cart" [size]="18" /> Add to cart</button>
                <button class="btn big save-btn" [class.on]="fav.has(p.id)" (click)="fav.toggle(p.id)">
                  <app-icon name="heart" [size]="18" [filled]="fav.has(p.id)" /> {{ fav.has(p.id) ? 'Saved' : 'Save' }}
                </button>
              </div>
            } @else {
              <div class="oos-note">Currently sold out in this size</div>
              @if (notified()) {
                <p class="promo-ok">Thanks! We'll email you as soon as it's back in stock.</p>
              } @else {
                <div class="notify-box">
                  <p>Want it? Get an email the moment it's back in stock:</p>
                  <div class="promo-row">
                    <input type="email" [(ngModel)]="notifyEmail" name="ne" placeholder="you@email.com" />
                    <button class="btn primary" (click)="notifyMe(p)" [disabled]="notifying() || !notifyEmail.trim()">
                      {{ notifying() ? '…' : 'Notify me' }}
                    </button>
                  </div>
                </div>
              }
              <button class="btn big save-btn" [class.on]="fav.has(p.id)" (click)="fav.toggle(p.id)">
                <app-icon name="heart" [size]="18" [filled]="fav.has(p.id)" /> {{ fav.has(p.id) ? 'Saved' : 'Save' }}
              </button>
            }
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

          <!-- Reviews -->
          <div class="notes-block reviews">
            <h3 class="block-title">Reviews @if ((p.ratingCount || 0) > 0) { <span class="dim">({{ p.ratingCount }})</span> }</h3>
            @for (r of reviewsSvc.reviews(); track r.id) {
              <div class="review">
                <div class="review-head">
                  <span class="stars">@for (s of [1,2,3,4,5]; track s) { <app-icon name="star" [size]="13" [filled]="s <= r.rating" /> }</span>
                  <strong>{{ r.name }}</strong>
                </div>
                @if (r.text) { <p class="review-text">{{ r.text }}</p> }
              </div>
            } @empty {
              <p class="dim">No reviews yet — be the first.</p>
            }

            @if (reviewSent()) {
              <p class="promo-ok">Thanks! Your review will appear once we've approved it.</p>
            } @else {
              <div class="review-form">
                <div class="star-pick">
                  @for (s of [1,2,3,4,5]; track s) {
                    <button type="button" class="star-btn" (click)="revRating.set(s)" [attr.aria-label]="s + ' stars'">
                      <app-icon name="star" [size]="24" [filled]="s <= revRating()" />
                    </button>
                  }
                </div>
                <input type="text" [(ngModel)]="revName" name="rn" placeholder="Your name" maxlength="60" />
                <textarea [(ngModel)]="revText" name="rt" rows="3" placeholder="Share what you think…" maxlength="600"></textarea>
                <button class="btn primary" (click)="submitReview(p)" [disabled]="reviewSending()">
                  {{ reviewSending() ? 'Sending…' : 'Post review' }}
                </button>
              </div>
            }
          </div>
        </div>
      </div>

      @if (related().length) {
        <section class="related">
          <h2 class="section-title">You may also like</h2>
          <div class="grid">
            @for (r of related(); track r.id) {
              <article class="card">
                <a class="thumb" [routerLink]="['/product', r.id]">
                  <img [src]="img(r)" [alt]="r.name" loading="lazy" (error)="imgErr($event)" />
                  @if (!r.inStock) { <span class="oos-badge">Sold out</span> }
                </a>
                <div class="card-body">
                  <a class="p-name" [routerLink]="['/product', r.id]">{{ r.name }}</a>
                  @if (r.inspiredBy) { <span class="p-inspired">Smells like {{ r.inspiredBy }}</span> }
                  <div class="p-foot"><span class="p-price">{{ hasSizes(r) ? 'From ' : '' }}{{ price(startingPrice(r)) }}</span></div>
                </div>
              </article>
            }
          </div>
        </section>
      }
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
  readonly selectedSizeKey = signal<ProductSizeKey | undefined>(undefined);
  readonly sizes = computed(() => { const p = this.product(); return p ? sizeOptions(p) : []; });
  readonly selectedSize = computed(() => {
    const opts = this.sizes();
    return (opts.find((o) => o.key === this.selectedSizeKey()) || opts[0])?.size || null;
  });
  readonly product = computed(() => {
    const id = this.id()?.get('id');
    return id ? this.svc.products().find((p) => p.id === id) : undefined;
  });

  private seo = inject(SeoService);
  readonly reviewsSvc = inject(ReviewsService);

  notifyEmail = '';
  readonly notifying = signal(false);
  readonly notified = signal(false);

  // Review form
  revName = '';
  revText = '';
  readonly revRating = signal(5);
  readonly reviewSending = signal(false);
  readonly reviewSent = signal(false);

  readonly related = computed<Product[]>(() => {
    const p = this.product();
    if (!p) return [];
    const all = this.svc.products().filter((x) => x.id !== p.id && x.active !== false);
    const sameGender = all.filter((x) => x.gender === p.gender || x.gender === 'Unisex' || p.gender === 'Unisex');
    const pool = sameGender.length >= 4 ? sameGender : all;
    return pool.slice(0, 4);
  });

  constructor() {
    effect(() => {
      const p = this.product();
      if (p) {
        this.seo.product(p);
        this.reviewsSvc.watch(p.id);
        const opts = sizeOptions(p);
        if (!opts.some((o) => o.key === this.selectedSizeKey())) this.selectedSizeKey.set(opts[0]?.key);
      }
    });
  }

  effSize = sizeEffectivePrice;
  saleSize = sizeOnSale;
  available = sizeAvailable;
  selectSize(key: ProductSizeKey): void {
    this.selectedSizeKey.set(key);
    this.qty.set(1);
    this.activeImg.set(0);
  }
  hasSizes(p: Product): boolean { return sizeOptions(p).length > 1; }
  startingPrice(p: Product): number { return fromPrice(p); }

  avg(p: Product): number {
    return (p.ratingCount || 0) > 0 ? (p.ratingSum || 0) / (p.ratingCount || 1) : 0;
  }
  avgRounded(p: Product): number { return Math.round(this.avg(p)); }

  async submitReview(p: Product): Promise<void> {
    if (this.reviewSending()) return;
    this.reviewSending.set(true);
    try {
      await this.reviewsSvc.add(p.id, this.revName, this.revRating(), this.revText);
      this.reviewSent.set(true);
      this.revName = ''; this.revText = ''; this.revRating.set(5);
    } catch { /* keep form */ }
    finally { this.reviewSending.set(false); }
  }

  img = productImage;

  async notifyMe(p: Product): Promise<void> {
    const email = this.notifyEmail.trim();
    if (!email) return;
    this.notifying.set(true);
    try {
      await addDoc(collection(getDb(), 'restockRequests'), {
        productId: p.id, productName: p.name, email, createdAt: Date.now(), notified: false,
      });
      this.notified.set(true);
    } catch {
      /* ignore — keep form */
    } finally {
      this.notifying.set(false);
    }
  }

  price = formatPrice;
  eff = effectivePrice;
  onSale = isOnSale;

  images(p: Product): string[] {
    const imgs = [p.imageUrl, ...(p.gallery ?? [])]
      .filter((x): x is string => isCustomImage(x))
      .map((x) => optimizedImage(x, 1200));
    return imgs.length ? imgs : [placeholderFor(p.gender)];
  }
  mainImage(p: Product): string | undefined {
    const sel = this.selectedSize();
    if (sel?.imageUrl) return optimizedImage(sel.imageUrl, 1200);
    if (p.imageUrl) return optimizedImage(p.imageUrl, 1200);
    return this.images(p)[this.activeImg()] ?? this.images(p)[0];
  }

  inc(): void {
    const max = this.selectedSize()?.stockQty ?? 99;
    this.qty.update((q) => Math.min(max, q + 1));
  }
  dec(): void { this.qty.update((q) => Math.max(1, q - 1)); }
  add(p: Product): void {
    const max = this.selectedSize()?.stockQty ?? 99;
    this.cart.add(p, Math.max(1, Math.min(max, this.qty())), this.selectedSizeKey());
  }
  imgErr(ev: Event): void { (ev.target as HTMLImageElement).style.visibility = 'hidden'; }
}
