import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductsService } from '@core/services/products.service';
import { CartService } from '@core/services/cart.service';
import { ContentService } from '@core/services/content.service';
import { SeoService } from '@core/services/seo.service';
import { FavoritesService } from '@core/services/favorites.service';
import { IconComponent } from '@shared/components/icon/icon.component';
import { Product, effectivePrice, isOnSale } from '@core/models';
import { formatPrice, optimizedImage, productImage, sizeOptions, sizeEffectivePrice, sizeOnSale, sizeAvailable, fromPrice } from '@core/utils';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [RouterLink, IconComponent, NgTemplateOutlet, FormsModule],
  templateUrl: './shop.component.html',
  styleUrl: './shop.component.scss',
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
  readonly inStockOnly = signal(false);
  readonly sort = signal<'featured' | 'newest' | 'price-asc' | 'price-desc' | 'name'>('featured');
  readonly slide = signal(0);
  readonly hoverPaused = signal(false);
  private readonly reducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  readonly userPaused = signal(this.reducedMotion);
  private timer: any;

  readonly hero = computed(() => this.content.content());
  readonly banners = computed(() => {
    const seen = new Set<string>();
    return this.content.activeBanners().filter((b) => {
      const key = [b.imageUrl || '', b.title || '', b.subtitle || '', b.ctaText || '', b.ctaLink || ''].join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });
  readonly imageOnly = computed(() =>
    this.banners().length > 0 &&
    this.banners().every((b) => !!b.imageUrl && !b.title && !b.subtitle && !b.ctaText),
  );

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
      .filter((p) => (this.inStockOnly() ? p.inStock && (p.stockQty == null || p.stockQty > 0) : true))
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

  // ---- Pagination: show a page at a time, not the whole catalogue ----
  private readonly pageSize = 12;
  readonly visibleCount = signal(this.pageSize);
  readonly visible = computed<Product[]>(() => this.filtered().slice(0, this.visibleCount()));
  showMore(): void { this.visibleCount.update((n) => n + this.pageSize); }

  price = formatPrice;
  eff = effectivePrice;
  onSale = isOnSale;
  img = productImage;
  avgRounded(p: Product): number {
    return (p.ratingCount || 0) > 0 ? Math.round((p.ratingSum || 0) / (p.ratingCount || 1)) : 0;
  }

  private seo = inject(SeoService);

  constructor() {
    this.seo.page('Kauā Fragrances');
    // Reset to the first page whenever the filter/search/sort changes.
    effect(() => {
      this.search(); this.category(); this.gender(); this.inStockOnly(); this.sort();
      this.visibleCount.set(this.pageSize);
    });
    this.route.queryParamMap.subscribe((q) => {
      const g = q.get('gender');
      this.gender.set(g ? g : 'all');
      if (g) setTimeout(() => this.scrollToShop(), 60);
    });
    this.timer = setInterval(() => {
      if (this.userPaused() || this.hoverPaused()) return;
      const n = this.banners().length;
      if (n > 1) this.slide.update((i) => (i + 1) % n);
    }, 5000);
  }

  ngOnDestroy(): void { clearInterval(this.timer); }

  prev(): void { const n = this.banners().length; this.slide.update((i) => (i - 1 + n) % n); }
  next(): void { const n = this.banners().length; this.slide.update((i) => (i + 1) % n); }

  goTo(i: number): void { this.slide.set(i); }

  togglePause(): void { this.userPaused.update((v) => !v); }

  // Only resume after focus leaves the whole carousel, not when moving between dots.
  onCarouselFocusOut(event: FocusEvent): void {
    const root = event.currentTarget as HTMLElement;
    if (!root.contains(event.relatedTarget as Node | null)) this.hoverPaused.set(false);
  }

  bannerImg(url?: string): string { return optimizedImage(url, 1600); }

  bannerErr(ev: Event): void { (ev.target as HTMLImageElement).style.display = 'none'; }

  add(p: Product): void { this.cart.add(p); }

  incCard(p: Product): void {
    const max = p.stockQty == null ? 99 : p.stockQty;
    this.cart.setQty(p.id, Math.min(max, this.cart.qtyOf(p.id) + 1));
  }

  hasSizes(p: Product): boolean { return sizeOptions(p).length > 1; }
  anySale(p: Product): boolean { return sizeOptions(p).some((o) => sizeOnSale(o.size)); }
  anyAvailable(p: Product): boolean { return sizeOptions(p).some((o) => sizeAvailable(o.size)); }
  cardPrice(p: Product): number { return fromPrice(p); }
  cardWas(p: Product): number | null {
    const opts = sizeOptions(p);
    const sale = opts.find((o) => sizeOnSale(o.size));
    return sale ? sale.size.price : null;
  }

  cta(link?: string): void {
    const l = (link || '').trim();
    if (!l || l.startsWith('#')) { this.scrollToShop(); return; }
    if (l.startsWith('http')) { window.open(l, '_blank'); return; }
    this.router.navigateByUrl(l);
  }
  scrollToShop(): void { document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }); }

  imgErr(ev: Event): void {
    const el = ev.target as HTMLImageElement;
    if (el.dataset['fallback']) { el.style.visibility = 'hidden'; return; }
    el.dataset['fallback'] = '1';
    el.src = 'placeholder-men.jpg';
  }
}
