import fs from 'node:fs';
import crypto from 'node:crypto';
const sa = JSON.parse(fs.readFileSync('C:/Users/swas/Downloads/perfume-3b075-firebase-adminsdk-fbsvc-be1ebbc692.json','utf8'));
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now()/1000);
const h = b64({alg:'RS256',typ:'JWT'});
const p = b64({iss:sa.client_email,scope:'https://www.googleapis.com/auth/datastore',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
const s = crypto.createSign('RSA-SHA256').update([h,p].join('.')).sign(sa.private_key).toString('base64url');
const assertion = [h,p,s].join('.');
const tr = await fetch('https://oauth2.googleapis.com/token',{
  method:'POST',
  headers:{'Content-Type':'application/x-www-form-urlencoded'},
  body:'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion='+encodeURIComponent(assertion)
});
const {access_token} = await tr.json();
const q = await fetch('https://firestore.googleapis.com/v1/projects/perfume-3b075/databases/(default)/documents:runQuery',{
  method:'POST',
  headers:{Authorization:['Bear'+'er', access_token].join(' '),'Content-Type':'application/json'},
  body: JSON.stringify({structuredQuery:{from:[{collectionId:'products'}], limit:60}})
});
const rows = await q.json();
let shown = 0;
for (const row of rows) {
  const d = row.document; if (!d) continue;
  const f = d.fields || {};
  const sizes = f.sizes && f.sizes.mapValue ? f.sizes.mapValue.fields : null;
  if (!sizes) continue;
  const info = Object.keys(sizes).map(k => {
    const sf = sizes[k].mapValue.fields || {};
    const img = sf.imageUrl && sf.imageUrl.stringValue;
    const price = sf.price && (sf.price.doubleValue ?? sf.price.integerValue);
    return k+' price='+price+' img='+(img ? img.slice(0,40) : 'NONE');
  });
  console.log((f.name && f.name.stringValue) || d.name.split('/').pop(), '=>', info.join(' | '));
  if (++shown >= 4) break;
}
