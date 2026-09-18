import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CartService } from './cart.service';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <header class="site-header">
      <a class="brand" routerLink="/">
        <img class="brand-mark" src="logo-mark.png" alt="Kauā Fragrances" />
        <span class="brand-name">Kauā</span>
      </a>
      <nav class="site-nav">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Shop</a>
        <a class="cart-link" routerLink="/cart" routerLinkActive="active" aria-label="Cart">
          <app-icon name="cart" [size]="20" />
          @if (cart.count() > 0) { <span class="cart-badge">{{ cart.count() }}</span> }
        </a>
      </nav>
    </header>

    <main class="site-main">
      <router-outlet />
    </main>

    <footer class="site-footer">
      <p>&copy; {{ year }} Kauā Fragrances · Inspired-by fragrance oils</p>
      <p class="footer-sub tagline">"one spray to last the day"</p>
    </footer>
  `,
})
export class AppComponent {
  readonly cart = inject(CartService);
  readonly year = new Date().getFullYear();
}
