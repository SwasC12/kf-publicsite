import fs from 'node:fs';
const dir='dist/kf-shop/browser';
const css=fs.readdirSync(dir).find(f=>f.startsWith('styles-')&&f.endsWith('.css'));
const js=fs.readdirSync(dir).find(f=>f.startsWith('main-')&&f.endsWith('.js'));
const c=fs.readFileSync(dir+'/'+css,'utf8');
const j=fs.readFileSync(dir+'/'+js,'utf8');
console.log('css', css, 'radio rule:', c.includes('method input[type=radio]'), '| notice:', c.includes('pay-cancelled'));
console.log('js', js, 'cart text:', j.includes('Payment was cancelled'), '| clears on paid:', j.includes('confirm-payment'));
