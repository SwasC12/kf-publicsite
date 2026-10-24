import { Routes } from '@angular/router';
import { ShopComponent } from '@features/shop/shop.component';
import { ProductComponent } from '@features/product/product.component';
import { CartComponent } from '@features/cart/cart.component';
import { CheckoutComponent } from '@features/checkout/checkout.component';
import { ConfirmationComponent } from '@features/checkout/confirmation.component';
import { AccountComponent } from '@features/account/account.component';
import { TrackComponent } from '@features/track/track.component';
import { SavedComponent } from '@features/saved/saved.component';
import { AboutComponent, ShippingComponent, FaqComponent, ContactComponent, TermsComponent, PrivacyComponent } from '@features/pages';
import { ResetPasswordComponent } from '@features/account/reset-password.component';

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
  { path: 'terms', component: TermsComponent, title: 'Terms of Sale · Kauā Fragrances' },
  { path: 'privacy', component: PrivacyComponent, title: 'Privacy Policy · Kauā Fragrances' },
  { path: 'reset-password', component: ResetPasswordComponent, title: 'Reset password · Kauā Fragrances' },
  { path: 'order-confirmed', component: ConfirmationComponent, title: 'Order placed · Kauā Fragrances' },
  { path: '**', redirectTo: '' },
];
