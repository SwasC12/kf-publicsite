const r=await fetch('https://kauafragrances.co.za/');
const h=await r.text(); const css=(h.match(/styles-[A-Z0-9]+\.css/)||[])[0];
const c=await fetch('https://kauafragrances.co.za/'+css); const t=await c.text();
console.log('css',css,'size-chip',t.includes('.size-chip'),'pay-info border',t.includes('border-left: 2px solid var(--gold)'));
