import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SettingsService } from '@core/services/settings.service';
import { SeoService } from '@core/services/seo.service';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss',
})
export class PrivacyComponent {
  private settings = inject(SettingsService);
  constructor() { inject(SeoService).page('Privacy Policy'); }
  get s() { return this.settings.settings(); }
  get company(): string { return this.s.companyName || 'Kauā Fragrances'; }
  get address(): string { return this.s.companyAddress || 'South Africa'; }
  get email(): string { return this.s.contactEmail || 'hello@kauafragrances.co.za'; }
}
