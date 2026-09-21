import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CartService } from './cart.service';
import { ContentService } from './content.service';
import { AuthService } from './auth.service';
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
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Shop</a>
        <a class="nav-icon" routerLink="/account" routerLinkActive="active" aria-label="Account" title="Account">
          <app-icon name="user" [size]="20" />
        </a>
        <a class="nav-icon cart-link" routerLink="/cart" routerLinkActive="active" aria-label="Cart">
          <app-icon name="cart" [size]="20" />
          @if (cart.count() > 0) { <span class="cart-badge">{{ cart.count() }}</span> }
        </a>
      </nav>
    </header>

    <main class="site-main"><router-outlet /></main>

    <footer class="site-footer">
      <img class="footer-mark" src="logo-mark.png" alt="" />
      <p class="footer-name">KAUĀ FRAGRANCES</p>
      <p class="tagline">"one spray to last the day"</p>
      <p class="footer-sub">&copy; {{ year }} Kauā Fragrances · Payment by EFT · Inspired-by fragrance oils</p>
    </footer>
  `,
})
export class AppComponent {
  readonly cart = inject(CartService);
  readonly content = inject(ContentService);
  readonly auth = inject(AuthService);
  readonly year = new Date().getFullYear();
}
