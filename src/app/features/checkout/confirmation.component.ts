import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OrdersService } from '@core/services/orders.service';
import { SettingsService } from '@core/services/settings.service';
import { IconComponent } from '@shared/components/icon/icon.component';
import { MixingComponent } from '@shared/components/mixing/mixing.component';
import { formatPrice } from '@core/utils';

@Component({
  selector: 'app-confirmation',
  standalone: true,
  imports: [RouterLink, IconComponent, MixingComponent],
  templateUrl: './confirmation.component.html',
  styleUrl: './confirmation.component.scss',
})
export class ConfirmationComponent {
  readonly orders = inject(OrdersService);
  private settings = inject(SettingsService);
  get bank() { return this.settings.bankingDetails(); }
  readonly copied = signal(false);
  price = formatPrice;

  copy(ref: string): void {
    navigator.clipboard?.writeText(ref).then(
      () => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 1800);
      },
      () => {},
    );
  }
}
