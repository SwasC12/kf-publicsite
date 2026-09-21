import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CartService } from './cart.service';
import { ContentService } from './content.service';
import { SettingsService } from './settings.service';
import { AuthService } from './auth.service';
import { FavoritesService } from './favorites.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    @if (content.content().announcementActive && content.content().announcementText) {
      <div class="announce">{{ content.content().announcementText }}</div>
    }

    <header class="site-header">
      <a class="brand" routerLink="/">
        <img class="brand-mark" src="logo-mark.png" alt="Kauā Fragrances" />
        <span class="brand-name">Kauā</span>
      </a>
      <nav class="site-nav">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-text">Shop</a>
        <a class="nav-icon cart-link" routerLink="/saved" routerLinkActive="active" aria-label="Saved" title="Saved">
          <app-icon name="heart" [size]="20" />
          @if (fav.count() > 0) { <span class="cart-badge">{{ fav.count() }}</span> }
        </a>
        <a class="nav-icon" routerLink="/account" routerLinkActive="active" aria-label="Account" title="Account">
          <app-icon name="user" [size]="20" />
        </a>
        <a class="nav-icon cart-link" routerLink="/cart" routerLinkActive="active" aria-label="Cart">
          <app-icon name="cart" [size]="20" />
          @if (cart.count() > 0) { <span class="cart-badge">{{ cart.count() }}</span> }
        </a>
      </nav>
    </header>

    <nav class="info-bar">
      <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Shop</a>
      <a routerLink="/about" routerLinkActive="active">About</a>
      <a routerLink="/shipping" routerLinkActive="active">Shipping &amp; Returns</a>
      <a routerLink="/faq" routerLinkActive="active">FAQ</a>
      <a routerLink="/track" routerLinkActive="active">Track order</a>
      <a routerLink="/contact" routerLinkActive="active">Contact</a>
    </nav>

    <main class="site-main"><router-outlet /></main>

    <footer class="site-footer">
      <img class="footer-mark" src="logo-mark.png" alt="" />
      <p class="footer-name">KAUĀ FRAGRANCES</p>
      <p class="tagline">"one spray to last the day"</p>
      <nav class="footer-links">
        <a routerLink="/">Shop</a>
        <a routerLink="/about">About</a>
        <a routerLink="/shipping">Shipping &amp; Returns</a>
        <a routerLink="/faq">FAQ</a>
        <a routerLink="/track">Track order</a>
        <a routerLink="/contact">Contact</a>
      </nav>
      <p class="footer-sub">&copy; {{ year }} Kauā Fragrances · Payment by EFT · Inspired-by fragrance oils</p>
    </footer>

    @if (whatsapp()) {
      <a class="whatsapp-fab" [href]="'https://wa.me/' + whatsapp()" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.043zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.767.967-.94 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>
      </a>
    }
  `,
})
export class AppComponent {
  readonly cart = inject(CartService);
  readonly content = inject(ContentService);
  readonly settings = inject(SettingsService);
  readonly auth = inject(AuthService);
  readonly fav = inject(FavoritesService);
  readonly year = new Date().getFullYear();

  whatsapp(): string { return this.settings.settings().whatsappNumber || ''; }
}
