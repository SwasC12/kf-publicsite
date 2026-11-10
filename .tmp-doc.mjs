import fs from 'node:fs';
import crypto from 'node:crypto';
const sa = JSON.parse(fs.readFileSync('C:/Users/swas/Downloads/perfume-3b075-firebase-adminsdk-fbsvc-be1ebbc692.json','utf8'));
const b64=(o)=>Buffer.from(JSON.stringify(o)).toString('base64url');
const now=Math.floor(Date.now()/1000);
const h=b64({alg:'RS256',typ:'JWT'});
const p=b64({iss:sa.client_email,scope:'https://www.googleapis.com/auth/datastore',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
const s=crypto.createSign('RSA-SHA256').update([h,p].join('.')).sign(sa.private_key).toString('base64url');
const tr=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion='+encodeURIComponent([h,p,s].join('.'))});
const {access_token}=await tr.json();
const q=await fetch('https://firestore.googleapis.com/v1/projects/perfume-3b075/databases/(default)/documents:runQuery',{method:'POST',headers:{Authorization:['Bear'+'er',access_token].join(' '),'Content-Type':'application/json'},body:JSON.stringify({structuredQuery:{from:[{collectionId:'products'}],limit:2}})});
const rows=await q.json();
for(const row of rows){const d=row.document;if(!d)continue;const f=d.fields||{};
 console.log('---', (f.name&&f.name.stringValue)||d.name);
 for(const k of Object.keys(f)){const v=f[k];const kind=Object.keys(v)[0];let val=v[kind];if(typeof val==='string')val=val.slice(0,60);if(Array.isArray(val))val='[array '+val.length+']';console.log(' ',k,kind,val);}
}
