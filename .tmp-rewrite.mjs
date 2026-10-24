import fs from 'fs';
import path from 'path';
const root='src/app';
const maps = {
  './cart.service':'@core/services/cart.service',
  './auth.service':'@core/services/auth.service',
  './customer.service':'@core/services/customer.service',
  './orders.service':'@core/services/orders.service',
  './products.service':'@core/services/products.service',
  './reviews.service':'@core/services/reviews.service',
  './favorites.service':'@core/services/favorites.service',
  './settings.service':'@core/services/settings.service',
  './content.service':'@core/services/content.service',
  './seo.service':'@core/services/seo.service',
  './email.service':'@core/services/email.service',
  './models':'@core/models',
  './util':'@core/utils',
  './discount-util':'@core/utils/discount',
  './firebase':'@core/firebase/firebase',
  './firebase.config':'@core/firebase/firebase.config',
  './banking.config':'@core/config/banking.config',
  './icon.component':'@shared/components/icon/icon.component',
  './mixing.component':'@shared/components/mixing/mixing.component',
  './shop.component':'@features/shop/shop.component',
  './product.component':'@features/product/product.component',
  './cart.component':'@features/cart/cart.component',
  './checkout.component':'@features/checkout/checkout.component',
  './confirmation.component':'@features/checkout/confirmation.component',
  './account.component':'@features/account/account.component',
  './reset-password.component':'@features/account/reset-password.component',
  './track.component':'@features/track/track.component',
  './saved.component':'@features/saved/saved.component',
  './pages.component':'@features/pages/pages.component',
};
function walk(dir){ for(const e of fs.readdirSync(dir,{withFileTypes:true})){ const p=path.join(dir,e.name); if(e.isDirectory()) walk(p); else if(e.name.endsWith('.ts')) fix(p); } }
function fix(p){
  let s=fs.readFileSync(p,'utf8');
  for(const [from,to] of Object.entries(maps)){
    s=s.split("from '"+from+"'").join("from '"+to+"'");
  }
  // add styleUrl when templateUrl exists and no styleUrl
  if(s.includes('templateUrl:') && !s.includes('styleUrl:')){
    const base=path.basename(p).replace(/\.ts$/,'');
    s=s.replace(/templateUrl: '([^']+)',?/, (m)=>m.endsWith(',')?m+"\n  styleUrl: './"+base+".scss',":"templateUrl: '"+m.match(/'([^']+)'/)[1]+"',\n  styleUrl: './"+base+".scss',");
    const scss=path.join(path.dirname(p),base+'.scss');
    if(!fs.existsSync(scss)) fs.writeFileSync(scss,'');
  }
  fs.writeFileSync(p,s);
}
walk(root);
console.log('imports + styleUrls updated');
