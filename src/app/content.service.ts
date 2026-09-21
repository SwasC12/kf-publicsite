import { Injectable, computed, signal } from '@angular/core';
import { doc, onSnapshot } from 'firebase/firestore';
import { getDb } from './firebase';
import { Banner, SiteContent } from './models';

@Injectable({ providedIn: 'root' })
export class ContentService {
  readonly content = signal<SiteContent>({});

  readonly activeBanners = computed<Banner[]>(() => (this.content().banners ?? []).filter((b) => b.active));

  constructor() {
    try {
      onSnapshot(
        doc(getDb(), 'siteContent', 'home'),
        (snap) => { if (snap.exists()) this.content.set(snap.data() as SiteContent); },
        () => {},
      );
    } catch {
      /* ignore — falls back to sensible defaults in the template */
    }
  }
}
