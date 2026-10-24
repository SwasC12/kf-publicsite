import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { addDoc, collection } from 'firebase/firestore';
import { getDb } from '@core/firebase/firebase';
import { ProductsService } from '@core/services/products.service';
import { CartService } from '@core/services/cart.service';
import { SeoService } from '@core/services/seo.service';
import { FavoritesService } from '@core/services/favorites.service';
import { ReviewsService } from '@core/services/reviews.service';
import { IconComponent } from '@shared/components/icon/icon.component';
import { Product, ProductSizeKey, effectivePrice, isOnSale } from '@core/models';
import { formatPrice, optimizedImage, placeholderFor, isCustomImage, productImage, sizeOptions, sizeEffectivePrice, sizeOnSale, sizeAvailable, fromPrice } from '@core/utils';

@Component({
  selector: 'app-product',
  standalone: true,
  imports: [RouterLink, IconComponent, FormsModule],
  templateUrl: './product.component.html',
  styleUrl: './product.component.scss',
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
