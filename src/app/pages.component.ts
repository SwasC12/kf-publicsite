import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SettingsService } from './settings.service';
import { SeoService } from './seo.service';

@Component({
  selector: 'app-about',
  standalone: true,
  template: `
    <article class="info-page reveal">
      <h1 class="page-title">About Kauā Fragrances</h1>
      <p>Kauā Fragrances offers <strong>inspired-by fragrance oils</strong> — long-lasting, affordable
        interpretations of the scents you love. Alcohol-free oils mean a richer, closer wear that lasts:
        one spray to last the day.</p>
      <p>Every order is hand-checked and dispatched with care. We're a small South African business and
        we treat every customer like a regular.</p>
      <p class="tagline big-tag">"one spray to last the day"</p>
      <a class="btn primary" routerLink="/">Browse fragrances</a>
    </article>
  `,
})
export class AboutComponent {
  constructor() { inject(SeoService).page('About'); }
}

@Component({
  selector: 'app-shipping',
  standalone: true,
  imports: [RouterLink],
  template: `
    <article class="info-page reveal">
      <h1 class="page-title">Shipping &amp; Returns</h1>
      <h2 class="block-title">Delivery</h2>
      <p>We deliver nationwide across South Africa. Delivery fees and any free-delivery threshold are shown at
        checkout. You can also choose <strong>collection</strong> where available.</p>
      <p>Orders are dispatched once your EFT payment reflects (usually 1–2 business days). You'll get an email
        when your order is confirmed and again when it's on its way.</p>
      <h2 class="block-title">Payment</h2>
      <p>Payment is by <strong>EFT / bank transfer</strong> using the reference on your order. No card needed.
        Please use your order reference so we can match your payment quickly.</p>
      <h2 class="block-title">Returns</h2>
      <p>For hygiene reasons opened oils can't be returned. If something arrives damaged or incorrect, contact us
        within 7 days of delivery and we'll make it right with a replacement or refund.</p>
      <a class="btn" routerLink="/contact">Contact us</a>
    </article>
  `,
})
export class ShippingComponent {
  constructor() { inject(SeoService).page('Shipping & Returns'); }
}

@Component({
  selector: 'app-faq',
  standalone: true,
  template: `
    <article class="info-page reveal">
      <h1 class="page-title">FAQ</h1>
      <h2 class="block-title">What are "inspired-by" oils?</h2>
      <p>They're our own interpretations inspired by popular designer fragrances — not the original brands, and
        not affiliated with them. Same vibe, oil-based, long-lasting, and far kinder on your wallet.</p>
      <h2 class="block-title">How long do they last?</h2>
      <p>Because they're concentrated oils (alcohol-free), they typically last much longer than an eau de toilette
        — often a full day from a single application.</p>
      <h2 class="block-title">How do I pay?</h2>
      <p>By EFT. After checkout you'll get a reference and our banking details — pay using that reference and we'll
        confirm and dispatch.</p>
      <h2 class="block-title">Can I track my order?</h2>
      <p>Yes — use the <a routerLink="/track">Track order</a> page with your reference, or sign in to see your order history.</p>
    </article>
  `,
  imports: [RouterLink],
})
export class FaqComponent {
  constructor() { inject(SeoService).page('FAQ'); }
}

@Component({
  selector: 'app-contact',
  standalone: true,
  template: `
    <article class="info-page reveal">
      <h1 class="page-title">Contact us</h1>
      <p>We'd love to help with orders, scent recommendations or anything else.</p>
      <ul class="contact-list">
        <li><strong>Email:</strong> <a [href]="'mailto:' + email()">{{ email() }}</a></li>
        @if (phone()) { <li><strong>Phone:</strong> <a [href]="'tel:' + phone()">{{ phone() }}</a></li> }
        @if (wa()) { <li><strong>WhatsApp:</strong> <a [href]="'https://wa.me/' + wa()" target="_blank" rel="noopener">Chat with us</a></li> }
      </ul>
    </article>
  `,
})
export class ContactComponent {
  private settings = inject(SettingsService);
  constructor() { inject(SeoService).page('Contact'); }
  email(): string { return this.settings.settings().contactEmail || 'hello@kauafragrances.co.za'; }
  phone(): string { return this.settings.settings().contactPhone || ''; }
  wa(): string { return this.settings.settings().whatsappNumber || ''; }
}
