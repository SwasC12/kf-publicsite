const base='https://kauafragrances.co.za';
const body = {
  contact: { name: 'R1 Test', email: 'swasteerc@gmail.com', phone: '0821234567' },
  delivery: { line1:'', line2:'', city:'', province:'', postalCode:'', country:'South Africa' },
  deliveryMethod: 'collection',
  items: [{ productId: 'Rp7pdq4eif3qsaMf2PWp', sizeKey: 'size30', qty: 1 }],
  discountCode: '',
  paymentMethod: 'yoco'
};
const r = await fetch(base+'/api/place-order', { method:'POST', headers:{'Content-Type':'application/json', Origin:base}, body: JSON.stringify(body) });
console.log(r.status, (await r.text()).slice(0,300));
