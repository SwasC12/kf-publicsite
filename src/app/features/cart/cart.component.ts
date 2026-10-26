import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
  /** Set when Yoco sends the customer back after a cancelled/failed payment. */
  readonly paymentCancelled = signal(
    inject(ActivatedRoute).snapshot.queryParamMap.get('payment') === 'cancelled',
  );
  price = formatPrice;
  imgErr(ev: Event): void { (ev.target as HTMLImageElement).style.visibility = 'hidden'; }
}
