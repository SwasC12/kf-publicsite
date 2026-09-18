import { Routes } from '@angular/router';
import { ShopComponent } from './shop.component';
import { ProductComponent } from './product.component';
import { CartComponent } from './cart.component';
import { CheckoutComponent } from './checkout.component';
import { ConfirmationComponent } from './confirmation.component';

export const routes: Routes = [
  { path: '', component: ShopComponent, title: 'Kaua Fragrances' },
  { path: 'product/:id', component: ProductComponent, title: 'Fragrance · Kaua Fragrances' },
  { path: 'cart', component: CartComponent, title: 'Cart · Kaua Fragrances' },
  { path: 'checkout', component: CheckoutComponent, title: 'Checkout · Kaua Fragrances' },
  { path: 'order-confirmed', component: ConfirmationComponent, title: 'Order placed · Kaua Fragrances' },
  { path: '**', redirectTo: '' },
];
