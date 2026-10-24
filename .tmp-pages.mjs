import fs from 'fs';
const p='src/app/features/pages/pages.component.ts';
const s=fs.readFileSync(p,'utf8');
const comps=[['app-about','about'],['app-shipping','shipping'],['app-faq','faq'],['app-contact','contact'],['app-terms','terms'],['app-privacy','privacy']];
for(const [sel,file] of comps){
  const si=s.indexOf("selector: '"+sel+"'");
  if(si<0){ console.log('missing selector',sel); continue; }
  const ti=s.indexOf('template: `',si);
  let i=ti+'template: `'.length, out='';
  while(i<s.length){ const ch=s[i]; if(ch==='\\'){ out+=s[i]+s[i+1]; i+=2; continue; } if(ch==='`') break; out+=ch; i++; }
  fs.writeFileSync('src/app/features/pages/'+file+'.component.html',out);
  console.log(file,out.length);
}
