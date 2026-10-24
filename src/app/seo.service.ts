import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { Product, effectivePrice } from './models';
import { optimizedImage, sizeOptions, sizeEffectivePrice } from './util';

const SITE = 'Kauā Fragrances';
const BASE = 'https://kauafragrances.co.za';
const DEFAULT_DESC = 'Inspired by designer fragrances — long-lasting, affordable, beautifully made. One spray to last the day. Order online, pay by EFT.';
const DEFAULT_IMG = `${BASE}/logo-lockup.png`;

@Injectable({ providedIn: 'root' })
export class SeoService {
  private title = inject(Title);
  private meta = inject(Meta);
  private doc = inject(DOCUMENT);

  page(title: string, description = DEFAULT_DESC, image = DEFAULT_IMG, url = BASE): void {
    const full = title === SITE ? title : `${title} · ${SITE}`;
    this.title.setTitle(full);
    this.set('description', description);
    this.setProp('og:title', full);
    this.setProp('og:description', description);
    this.setProp('og:image', image);
    this.setProp('og:url', url);
    this.setProp('og:type', 'website');
    this.set('twitter:card', 'summary_large_image');
    this.setCanonical(url);
    this.clearJsonLd();
  }

  product(p: Product): void {
    const url = `${BASE}/product/${p.id}`;
    const img = p.imageUrl ? optimizedImage(p.imageUrl, 1200) : DEFAULT_IMG;
    const desc = p.description || `${p.name} — inspired by designer perfumes from ${SITE}.`;
    this.page(p.name, desc, img, url);
    this.setProp('og:type', 'product');
    const opts = sizeOptions(p);
    const prices = opts.map((o) => sizeEffectivePrice(o.size));
    const low = prices.length ? Math.min(...prices) : effectivePrice(p);
    const high = prices.length ? Math.max(...prices) : effectivePrice(p);
    this.jsonLd({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      image: [img, ...(p.gallery ?? [])],
      description: desc,
      brand: { '@type': 'Brand', name: SITE },
      offers: opts.length > 1 ? {
        '@type': 'AggregateOffer',
        priceCurrency: 'ZAR',
        lowPrice: low.toFixed(2),
        highPrice: high.toFixed(2),
        offerCount: opts.length,
        availability: opts.some((o) => o.size.inStock && (o.size.stockQty == null || Number(o.size.stockQty) > 0))
          ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url,
      } : {
        '@type': 'Offer',
        priceCurrency: 'ZAR',
        price: low.toFixed(2),
        availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url,
      },
    });
  }

  private setCanonical(url: string): void {
    let link = this.doc.querySelector('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private set(name: string, content: string): void {
    this.meta.updateTag({ name, content });
  }
  private setProp(property: string, content: string): void {
    this.meta.updateTag({ property, content });
  }

  private jsonLd(data: unknown): void {
    this.clearJsonLd();
    const s = this.doc.createElement('script');
    s.type = 'application/ld+json';
    s.id = 'kf-jsonld';
    s.text = JSON.stringify(data);
    this.doc.head.appendChild(s);
  }
  private clearJsonLd(): void {
    const existing = this.doc.getElementById('kf-jsonld');
    if (existing) existing.remove();
  }
}
