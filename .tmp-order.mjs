const base='https://kauafragrances.co.za';
const body = {
  contact: { name: 'OpenClaw Test', email: 'swasteerc@gmail.com', phone: '0821234567' },
  delivery: { line1: '1 Test Street', line2: '', city: 'Cape Town', province: 'Western Cape', postalCode: '8001', country: 'South Africa' },
  deliveryMethod: 'delivery',
  items: [{ productId: '1Fs5TaP3zZKWLLr2cdb0', sizeKey: 'size30', qty: 1 }],
  discountCode: '',
  paymentMethod: 'yoco'
};
const r = await fetch(base+'/api/place-order', { method:'POST', headers:{'Content-Type':'application/json', Origin:base}, body: JSON.stringify(body) });
const t = await r.text();
console.log('STATUS', r.status);
console.log(t.slice(0, 600));
try { const j = JSON.parse(t); if (j.redirectUrl) console.log('REDIRECT_HOST', new URL(j.redirectUrl).host); } catch(e){}
