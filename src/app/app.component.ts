import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CartService } from '@core/services/cart.service';
import { ContentService } from '@core/services/content.service';
import { SettingsService } from '@core/services/settings.service';
import { AuthService } from '@core/services/auth.service';
import { FavoritesService } from '@core/services/favorites.service';
import { IconComponent } from '@shared/components/icon/icon.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  host: { '(document:keydown.escape)': 'closeMenu()' },
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly cart = inject(CartService);
  readonly content = inject(ContentService);
  readonly settings = inject(SettingsService);
  readonly auth = inject(AuthService);
  readonly fav = inject(FavoritesService);
  readonly year = new Date().getFullYear();
  readonly toast = signal<string | null>(null);
  readonly menuOpen = signal(false);
  readonly menuBtn = viewChild<ElementRef<HTMLButtonElement>>('menuBtn');
  readonly drawer = viewChild<ElementRef<HTMLElement>>('drawer');
  readonly drawerClose = viewChild<ElementRef<HTMLButtonElement>>('drawerClose');
  readonly canInstall = signal(false);
  private installEvent: any = null;
  private toastTimer: any;

  constructor() {
    effect(() => {
      const a = this.cart.lastAdd();
      if (a) {
        this.toast.set(a.name);
        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => this.toast.set(null), 2600);
      }
    });
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.installEvent = e;
      this.canInstall.set(true);
    });
    window.addEventListener('appinstalled', () => { this.canInstall.set(false); this.installEvent = null; });
    // Keep the page behind the mobile menu from scrolling.
    effect(() => {
      document.body.style.overflow = this.menuOpen() ? 'hidden' : '';
    });
  }

  openMenu(): void {
    this.menuOpen.set(true);
    setTimeout(() => this.drawerClose()?.nativeElement.focus(), 0);
  }

  closeMenu(): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    this.menuBtn()?.nativeElement.focus();
  }

  /** Keep keyboard focus inside the open drawer. */
  onDrawerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const root = this.drawer()?.nativeElement;
    if (!root) return;
    const focusable = Array.from(
      root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea'),
    ).filter((el) => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async installApp(): Promise<void> {
    this.menuOpen.set(false);
    if (!this.installEvent) return;
    this.installEvent.prompt();
    try { await this.installEvent.userChoice; } catch { /* ignore */ }
    this.installEvent = null;
    this.canInstall.set(false);
  }

  whatsapp(): string { return this.settings.settings().whatsappNumber || ''; }
}
