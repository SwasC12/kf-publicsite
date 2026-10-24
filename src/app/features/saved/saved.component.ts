import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FavoritesService } from '@core/services/favorites.service';
import { CartService } from '@core/services/cart.service';
import { SeoService } from '@core/services/seo.service';
import { IconComponent } from '@shared/components/icon/icon.component';
import { Product, effectivePrice, isOnSale } from '@core/models';
import { formatPrice, productImage, sizeOptions, sizeOnSale, sizeAvailable, fromPrice } from '@core/utils';

@Component({
  selector: 'app-saved',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './saved.component.html',
  styleUrl: './saved.component.scss',
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
  hasSizes(p: Product): boolean { return sizeOptions(p).length > 1; }
  anySale(p: Product): boolean { return sizeOptions(p).some((o) => sizeOnSale(o.size)); }
  anyAvailable(p: Product): boolean { return sizeOptions(p).some((o) => sizeAvailable(o.size)); }
  cardPrice(p: Product): number { return fromPrice(p); }
  cardWas(p: Product): number | null {
    const sale = sizeOptions(p).find((o) => sizeOnSale(o.size));
    return sale ? sale.size.price : null;
  }
}
