import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '@core/services/seo.service';

@Component({
  selector: 'app-shipping',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './shipping.component.html',
  styleUrl: './shipping.component.scss',
})
export class ShippingComponent {
  constructor() { inject(SeoService).page('Shipping & Returns'); }
}
