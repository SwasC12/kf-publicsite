import { Routes } from '@angular/router';
import { ShopComponent } from './shop.component';
import { ProductComponent } from './product.component';
import { CartComponent } from './cart.component';
import { CheckoutComponent } from './checkout.component';
import { ConfirmationComponent } from './confirmation.component';
import { AccountComponent } from './account.component';
import { TrackComponent } from './track.component';
import { SavedComponent } from './saved.component';
import { AboutComponent, ShippingComponent, FaqComponent, ContactComponent } from './pages.component';

export const routes: Routes = [
  { path: '', component: ShopComponent, title: 'Kauā Fragrances' },
  { path: 'product/:id', component: ProductComponent, title: 'Fragrance · Kauā Fragrances' },
  { path: 'saved', component: SavedComponent, title: 'Saved · Kauā Fragrances' },
  { path: 'cart', component: CartComponent, title: 'Cart · Kauā Fragrances' },
  { path: 'checkout', component: CheckoutComponent, title: 'Checkout · Kauā Fragrances' },
  { path: 'account', component: AccountComponent, title: 'My account · Kauā Fragrances' },
  { path: 'track', component: TrackComponent, title: 'Track order · Kauā Fragrances' },
  { path: 'about', component: AboutComponent, title: 'About · Kauā Fragrances' },
  { path: 'shipping', component: ShippingComponent, title: 'Shipping & Returns · Kauā Fragrances' },
  { path: 'faq', component: FaqComponent, title: 'FAQ · Kauā Fragrances' },
  { path: 'contact', component: ContactComponent, title: 'Contact · Kauā Fragrances' },
  { path: 'order-confirmed', component: ConfirmationComponent, title: 'Order placed · Kauā Fragrances' },
  { path: '**', redirectTo: '' },
];
