const base='https://kauafragrances.co.za';
const r = await fetch(base+'/api/yoco-setup', { method:'POST', headers:{'Content-Type':'application/json','Origin':base}, body:'{}' });
console.log(r.status, await r.text());
