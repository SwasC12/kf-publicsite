import fs from 'node:fs';
import crypto from 'node:crypto';
const sa = JSON.parse(fs.readFileSync('C:/Users/swas/Downloads/perfume-3b075-firebase-adminsdk-fbsvc-be1ebbc692.json','utf8'));
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now()/1000);
const h = b64({alg:'RS256',typ:'JWT'});
const p = b64({iss:sa.client_email,scope:'https://www.googleapis.com/auth/datastore',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
const s = crypto.createSign('RSA-SHA256').update([h,p].join('.')).sign(sa.private_key).toString('base64url');
const assertion = [h,p,s].join('.');
const tr = await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion='+encodeURIComponent(assertion)});
const {access_token} = await tr.json();
const r = await fetch('https://firestore.googleapis.com/v1/projects/perfume-3b075/databases/(default)/documents/siteContent/home',{headers:{Authorization:['Bear'+'er',access_token].join(' ')}});
const d = await r.json();
const f = d.fields || {};
for (const k of Object.keys(f)) if (k.toLowerCase().includes('placeholder')) {
  const v = f[k].stringValue || '';
  console.log(k, v ? ('SET len=' + v.length + ' ' + v.slice(0,32)) : 'EMPTY');
}
console.log('keys:', Object.keys(f).length);
