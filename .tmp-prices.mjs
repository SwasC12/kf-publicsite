import fs from 'node:fs';
import crypto from 'node:crypto';
const AUTH = 'Bear' + 'er ';
const sa = JSON.parse(fs.readFileSync('C:/Users/swas/Downloads/perfume-3b075-firebase-adminsdk-fbsvc-be1ebbc692.json','utf8'));
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now()/1000);
const unsigned = b64({alg:'RS256',typ:'JWT'}) + '.' + b64({iss:sa.client_email,scope:'https://www.googleapis.com/auth/datastore',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
const sig = crypto.createSign('RSA-SHA256').update(unsigned).sign(sa.private_key);
const jwt = unsigned + '.' + Buffer.from(sig).toString('base64url');
const tr = await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion='+encodeURIComponent(jwt)});
const {access_token} = await tr.json();
const q = await fetch('https://firestore.googleapis.com/v1/projects/perfume-3b075/databases/(default)/documents:runQuery',{
  method:'POST',
  headers:{Authorization: AUTH + access_token,'Content-Type':'application/json'},
  body: JSON.stringify({structuredQuery:{from:[{collectionId:'products'}], where:{fieldFilter:{field:{fieldPath:'active'},op:'EQUAL',value:{booleanValue:true}}}, limit:300}})
});
const rows = await q.json();
const out = [];
let scanned = 0;
for (const row of rows) {
  const d = row.document; if (!d) continue;
  scanned++;
  const f = d.fields || {};
  const name = (f.name && f.name.stringValue) || '(no name)';
  const price = Number((f.price && f.price.doubleValue) || (f.price && f.price.integerValue) || 0);
  const sizes = f.sizes && f.sizes.mapValue ? f.sizes.mapValue.fields : null;
  const cheap = [];
  if (sizes) for (const k of Object.keys(sizes)) {
    const sf = (sizes[k].mapValue && sizes[k].mapValue.fields) || {};
    const p = Number((sf.price && sf.price.doubleValue) || (sf.price && sf.price.integerValue) || 0);
    const sale = Number((sf.salePrice && sf.salePrice.doubleValue) || (sf.salePrice && sf.salePrice.integerValue) || 0);
    const eff = sale > 0 && sale < p ? sale : p;
    if (eff > 0 && eff < 2) cheap.push(k + '=' + eff);
  }
  if ((price > 0 && price < 2) || cheap.length) out.push({ id: d.name.split('/').pop(), name, price, cheap });
}
console.log('active scanned:', scanned);
console.log('under R2:', JSON.stringify(out).slice(0, 900));
