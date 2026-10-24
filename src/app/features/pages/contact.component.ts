import { Component, inject } from '@angular/core';
import { SettingsService } from '@core/services/settings.service';
import { SeoService } from '@core/services/seo.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss',
})
export class ContactComponent {
  private settings = inject(SettingsService);
  constructor() { inject(SeoService).page('Contact'); }
  email(): string { return this.settings.settings().contactEmail || 'hello@kauafragrances.co.za'; }
  phone(): string { return this.settings.settings().contactPhone || ''; }
  wa(): string { return this.settings.settings().whatsappNumber || ''; }
}
