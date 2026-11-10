import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { ReferralService } from '@core/services/referral.service';
import { SeoService } from '@core/services/seo.service';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-referrals',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './referrals.component.html',
  styleUrl: './referrals.component.scss',
})
export class ReferralsComponent {
  readonly auth = inject(AuthService);
  readonly referral = inject(ReferralService);
  readonly copied = signal(false);

  constructor() {
    inject(SeoService).page('Refer a friend');
    effect(() => {
      if (this.auth.user()) void this.referral.load();
    });
  }

  copy(code: string): void {
    navigator.clipboard?.writeText(code).then(
      () => { this.copied.set(true); setTimeout(() => this.copied.set(false), 1800); },
      () => {},
    );
  }

  private message(code: string): string {
    return 'Try Kauā Fragrances — use my code ' + code + ' at checkout. Every 3 friends who order earns a free 30 ml. https://kauafragrances.co.za';
  }

  shareWhatsApp(code: string): void {
    window.open('https://wa.me/?text=' + encodeURIComponent(this.message(code)), '_blank');
  }

  shareEmail(code: string): void {
    const subject = encodeURIComponent('My Kauā Fragrances referral code');
    const body = encodeURIComponent(this.message(code));
    window.location.href = 'mailto:?subject=' + subject + '&body=' + body;
  }
}
