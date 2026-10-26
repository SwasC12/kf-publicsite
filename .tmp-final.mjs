const base='https://kauafragrances.co.za';
const r = await fetch(base+'/api/yoco-setup',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:'{}'});
console.log('setup', r.status, (await r.text()).slice(0,60));
const w = await fetch(base+'/api/yoco/webhook');
console.log('webhook GET', w.status, (await w.text()).slice(0,20));
