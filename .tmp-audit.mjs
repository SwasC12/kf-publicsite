import fs from 'fs'; import path from 'path';
function walk(d,out=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name); if(e.isDirectory()) walk(p,out); else if(e.name.endsWith('.ts')) out.push(p);} return out;}
const files=walk('src/app');
const inline=[];
const missing=[];
for(const f of files){const s=fs.readFileSync(f,'utf8'); if(/template:\s*`/.test(s)||/styles:\s*\[`/.test(s)) inline.push(f); if(s.includes('@Component')&&s.includes('templateUrl')&&!s.includes('styleUrl')) missing.push(f);}
console.log('inline:',inline);
console.log('missing styleUrl:',missing);
