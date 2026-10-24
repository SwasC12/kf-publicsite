import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SettingsService } from '@core/services/settings.service';
import { SeoService } from '@core/services/seo.service';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './terms.component.html',
  styleUrl: './terms.component.scss',
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
