import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavoritesService } from './favorites.service';
import { CartService } from './cart.service';
import { SeoService } from './seo.service';
import { IconComponent } from './icon.component';
import { Product, effectivePrice, isOnSale } from './models';
import { formatPrice, productImage } from './util';

@Component({
  selector: 'app-saved',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <h1 class="page-title">Saved fragrances</h1>
    @if (fav.items().length === 0) {
      <div class="notice">
        <app-icon name="heart" [size]="40" />
        <p>You haven't saved anything yet. Tap the heart on a fragrance to save it here.</p>
        <a class="btn primary" routerLink="/">Browse fragrances</a>
      </div>
    } @else {
      <div class="grid">
        @for (p of fav.items(); track p.id) {
          <article class="card">
            <button class="fav-btn on" (click)="fav.toggle(p.id)" aria-label="Remove from saved">
              <app-icon name="heart" [size]="18" [filled]="true" />
            </button>
            <a class="thumb" [routerLink]="['/product', p.id]">
              <img [src]="img(p)" [alt]="p.name" loading="lazy" (error)="imgErr($event)" />
              @if (onSale(p)) { <span class="sale-badge">Sale</span> }
              @if (!p.inStock) { <span class="oos-badge">Sold out</span> }
            </a>
            <div class="card-body">
              <a class="p-name" [routerLink]="['/product', p.id]">{{ p.name }}</a>
              @if (p.inspiredBy) { <span class="p-inspired">Smells like {{ p.inspiredBy }}</span> }
              <div class="p-foot">
                <span class="p-price">
                  @if (onSale(p)) { <span class="was">{{ price(p.price) }}</span> }
                  {{ price(eff(p)) }}
                </span>
                @if (p.inStock) {
                  <button class="add-btn" (click)="cart.add(p)"><app-icon name="plus" [size]="16" /> Add</button>
                } @else { <button class="add-btn disabled" disabled>Sold out</button> }
              </div>
            </div>
          </article>
        }
      </div>
    }
  `,
})
export class SavedComponent {
  readonly fav = inject(FavoritesService);
  readonly cart = inject(CartService);
  constructor() { inject(SeoService).page('Saved'); }
  price = formatPrice;
  eff = effectivePrice;
  onSale = isOnSale;
  img = productImage;
  imgErr(ev: Event): void { (ev.target as HTMLImageElement).style.visibility = 'hidden'; }
}
