import fs from 'node:fs';
const s = fs.readFileSync('src/app/core/services/customer.service.ts','utf8');
const line = s.split(/\r?\n/).find(l=>l.includes('Authorization'));
console.log(JSON.stringify(line));
const e = fs.readFileSync('C:/Users/swas/development/Perfume/src/app/email.service.ts','utf8');
console.log(JSON.stringify(e.split(/\r?\n/).find(l=>l.includes('Authorization'))));
