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
      <p>Kauā Fragrances offers — long-lasting, affordable
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

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [RouterLink],
  template: `
    <article class="info-page legal reveal">
      <h1 class="page-title">Terms of Sale</h1>
      <p class="legal-updated">Last updated: October 2026</p>

      <h2 class="block-title">Who we are</h2>
      <p>{{ company }} is a South African fragrance business. Registration number:
        {{ registration }}. Business address: {{ address }}.
        Contact: <a [href]="'mailto:' + email">{{ email }}</a>@if (phone) { · {{ phone }} }.</p>

      <h2 class="block-title">Our fragrances</h2>
      <p>We sell our own interpretations inspired by popular designer fragrances. We are not
        affiliated with, endorsed by, or connected to the original brands. Product names are used
        only to describe the scent profile. Photographs and descriptions are indicative; natural
        variation in colour and packaging may occur.</p>

      <h2 class="block-title">Orders and payment</h2>
      <p>All prices are in South African Rand (ZAR) and include VAT where applicable. An order is
        accepted when we confirm it by email. We may decline or cancel an order if stock is
        unavailable, a price was listed in error, or we suspect fraud. Payment is by EFT or another
        method shown at checkout. Please use your order reference on any payment.</p>

      <h2 class="block-title">Delivery and collection</h2>
      <p>Delivery fees and any free-delivery threshold are shown at checkout. We dispatch after
        payment reflects and usually within 1–3 business days. Delivery times depend on the courier
        and your area. Collection is available where offered; we will arrange the details after your
        order. Risk in the goods passes to you on delivery or collection.</p>

      <h2 class="block-title">Returns and cooling-off</h2>
      <p>If you are a consumer buying online, you may cancel an order within 7 days of delivery
        under the Electronic Communications and Transactions Act, provided the goods are unused and
        in their original packaging. For hygiene reasons, opened fragrance oils cannot be returned.
        If an item arrives damaged or incorrect, contact us within 7 days of delivery and we will
        arrange a replacement or refund. This does not affect your rights under the Consumer
        Protection Act.</p>

      <h2 class="block-title">Cancellations</h2>
      <p>You may cancel an order before it is dispatched by contacting us. If it has already been
        dispatched, the returns process above applies.</p>

      <h2 class="block-title">Liability</h2>
      <p>We are responsible for delivering goods that match the description and are of good
        quality. To the extent permitted by law, we are not liable for indirect or consequential
        loss. Nothing in these terms limits rights you have under South African consumer law.</p>

      <h2 class="block-title">Contact</h2>
      <p>Questions about an order or these terms: <a [href]="'mailto:' + email">{{ email }}</a>@if (phone) { · {{ phone }} }.
        You can also use our <a routerLink="/contact">contact page</a>.</p>
    </article>
  `,
})
export class TermsComponent {
  private settings = inject(SettingsService);
  constructor() { inject(SeoService).page('Terms of Sale'); }
  get s() { return this.settings.settings(); }
  get company(): string { return this.s.companyName || 'Kauā Fragrances'; }
  get registration(): string { return this.s.companyRegistration || 'available on request'; }
  get address(): string { return this.s.companyAddress || 'South Africa'; }
  get email(): string { return this.s.contactEmail || 'hello@kauafragrances.co.za'; }
  get phone(): string { return this.s.contactPhone || ''; }
}

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [RouterLink],
  template: `
    <article class="info-page legal reveal">
      <h1 class="page-title">Privacy Policy</h1>
      <p class="legal-updated">Last updated: October 2026</p>

      <h2 class="block-title">Who is responsible</h2>
      <p>{{ company }} ({{ address }}) is the responsible party for the personal information
        described below. Privacy questions: <a [href]="'mailto:' + email">{{ email }}</a>.</p>

      <h2 class="block-title">What we collect</h2>
      <p>When you create an account, place an order or contact us we collect your name, email
        address, phone number, delivery/billing address, order contents and order notes. If you
        review a product we store the name and review text you submit. We do not store card numbers;
        card payments are handled by our payment provider.</p>

      <h2 class="block-title">Why we use it</h2>
      <p>We use your information to process and deliver orders, confirm payments, provide customer
        support, manage returns, prevent fraud, and keep records required by law. With your consent,
        we may send occasional product updates; you can opt out at any time.</p>

      <h2 class="block-title">Who we share it with</h2>
      <p>We share only what is necessary with service providers that help us run the shop:
        our hosting and database provider, our email provider, our payment provider and our courier.
        They may process information outside South Africa; we use providers with appropriate
        safeguards. We do not sell your personal information.</p>

      <h2 class="block-title">Cookies and local storage</h2>
      <p>We use browser storage to keep your cart and saved fragrances, and to keep you signed in.
        We do not use advertising cookies. If we add analytics later, we will ask for consent where
        required.</p>

      <h2 class="block-title">How long we keep it</h2>
      <p>We keep order and payment records for as long as required for tax, accounting and dispute
        purposes. Account details are kept until you ask us to delete them, subject to those legal
        record-keeping obligations.</p>

      <h2 class="block-title">Your rights</h2>
      <p>Under POPIA you may ask to access, correct or delete your personal information, object to
        processing, or withdraw consent. Email <a [href]="'mailto:' + email">{{ email }}</a> and we
        will respond within a reasonable time. You may also complain to the Information Regulator
        of South Africa.</p>

      <h2 class="block-title">Security</h2>
      <p>We use access controls, encrypted connections and restricted admin access. No system is
        completely secure; if you suspect a problem, contact us immediately.</p>

      <p class="legal-note">This policy is a plain-language summary of how we handle personal
        information. It does not limit your rights under POPIA.</p>
    </article>
  `,
})
export class PrivacyComponent {
  private settings = inject(SettingsService);
  constructor() { inject(SeoService).page('Privacy Policy'); }
  get s() { return this.settings.settings(); }
  get company(): string { return this.s.companyName || 'Kauā Fragrances'; }
  get address(): string { return this.s.companyAddress || 'South Africa'; }
  get email(): string { return this.s.contactEmail || 'hello@kauafragrances.co.za'; }
}

