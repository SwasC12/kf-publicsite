import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Stop the browser from restoring a stale scroll position on refresh, which
// made the top banner jump / appear cut off until you scrolled. We always
// start at the top; the router handles per-navigation scrolling.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
