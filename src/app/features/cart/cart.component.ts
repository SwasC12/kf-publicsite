import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '@core/services/cart.service';
import { SettingsService } from '@core/services/settings.service';
import { IconComponent } from '@shared/components/icon/icon.component';
import { formatPrice } from '@core/utils';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss',
})
export class CartComponent {
  readonly cart = inject(CartService);
  readonly settings = inject(SettingsService);
  readonly threshold = computed(() => this.settings.settings().freeDeliveryThreshold ?? null);
  price = formatPrice;
  imgErr(ev: Event): void { (ev.target as HTMLImageElement).style.visibility = 'hidden'; }
}
