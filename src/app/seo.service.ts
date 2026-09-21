import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { Product, effectivePrice } from './models';

const SITE = 'Kauā Fragrances';
const BASE = 'https://kauafragrances.co.za';
const DEFAULT_DESC = 'Inspired-by fragrance oils — long-lasting, affordable, beautifully made. One spray to last the day. Order online, pay by EFT.';
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
    this.clearJsonLd();
  }

  product(p: Product): void {
    const url = `${BASE}/product/${p.id}`;
    const img = p.imageUrl || DEFAULT_IMG;
    const desc = p.description || `${p.name} — inspired-by fragrance oil from ${SITE}.`;
    this.page(p.name, desc, img, url);
    this.setProp('og:type', 'product');
    this.jsonLd({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      image: [img, ...(p.gallery ?? [])],
      description: desc,
      brand: { '@type': 'Brand', name: SITE },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'ZAR',
        price: effectivePrice(p).toFixed(2),
        availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url,
      },
    });
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
