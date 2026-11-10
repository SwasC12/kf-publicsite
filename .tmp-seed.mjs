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
const AUTH=['Bear'+'er',access_token].join(' ');

function art(gender, size, tints){
  const [bg1,bg2,ink,accent]=tints;
  const label = size+' ml';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750">'
   +'<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="'+bg1+'"/><stop offset="1" stop-color="'+bg2+'"/></linearGradient></defs>'
   +'<rect width="600" height="750" fill="url(#g)"/>'
   +'<circle cx="300" cy="300" r="150" fill="none" stroke="'+accent+'" stroke-width="2" opacity="0.55"/>'
   +'<circle cx="300" cy="300" r="112" fill="'+accent+'" opacity="0.10"/>'
   +'<text x="300" y="292" text-anchor="middle" font-family="Georgia, serif" font-size="30" letter-spacing="6" fill="'+ink+'" opacity="0.85">KAUĀ</text>'
   +'<text x="300" y="352" text-anchor="middle" font-family="Georgia, serif" font-size="54" letter-spacing="2" fill="'+ink+'">'+label+'</text>'
   +'<text x="300" y="392" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="13" letter-spacing="4" fill="'+ink+'" opacity="0.6">EAU DE PARFUM</text>'
   +'<text x="300" y="660" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="12" letter-spacing="5" fill="'+ink+'" opacity="0.45">'+gender.toUpperCase()+'</text>'
   +'</svg>';
}

const tintsMen={
  '30':['#f3efe9','#e6ded2','#2a2320','#a9603e'],
  '50':['#efe8de','#ddd1bf','#2a2320','#a9603e'],
  '100':['#e9e1d4','#cfc0aa','#2a2320','#8a4a2e']
};
const tintsWomen={
  '30':['#f7f0f0','#eedcdd','#3a2b2b','#b06a6a'],
  '50':['#f4e9ea','#e7cfd1','#3a2b2b','#a65c5c'],
  '100':['#efe0e2','#dcbfc3','#3a2b2b','#8f4a4a']
};

const out={};
for (const [gender,set] of [['Men',tintsMen],['Women',tintsWomen]]) {
  for (const size of ['30','50','100']) {
    const svg = art(gender, size, set[size]);
    const dataUri = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
    const form = new FormData();
    form.append('file', dataUri);
    form.append('upload_preset','kaua_unsigned');
    form.append('folder','kaua/placeholders');
    form.append('public_id', 'kaua/placeholders/' + gender.toLowerCase() + size);
    const r = await fetch('https://api.cloudinary.com/v1_1/dpuvlgxsa/image/upload',{method:'POST',body:form});
    const j = await r.json();
    out[(gender==='Women'?'placeholderWomen':'placeholderMen')+size] = j.secure_url || '';
    console.log(gender, size, r.status, j.secure_url ? 'ok' : JSON.stringify(j).slice(0,120));
  }
}

// Merge just the placeholder fields into siteContent/home.
const fields={};
for (const k of Object.keys(out)) if (out[k]) fields[k]={stringValue:out[k]};
const mask=Object.keys(fields).map(k=>'updateMask.fieldPaths='+k).join('&');
const res=await fetch('https://firestore.googleapis.com/v1/projects/perfume-3b075/databases/(default)/documents/siteContent/home?'+mask,{
  method:'PATCH', headers:{Authorization:AUTH,'Content-Type':'application/json'}, body: JSON.stringify({fields})
});
console.log('firestore patch', res.status, (await res.text()).slice(0,120));
console.log(JSON.stringify(out,null,1).slice(0,600));
