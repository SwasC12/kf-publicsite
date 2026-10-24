import fs from 'fs';
import path from 'path';
const files = [
  'app.component.ts','shop.component.ts','product.component.ts','cart.component.ts',
  'checkout.component.ts','confirmation.component.ts','account.component.ts',
  'track.component.ts','saved.component.ts','reset-password.component.ts',
  'icon.component.ts','mixing.component.ts'
];
const dir = 'src/app';
for (const file of files) {
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) { console.log('missing', p); continue; }
  let s = fs.readFileSync(p, 'utf8');
  const base = file.replace(/\.ts$/, '');
  // Extract template: `...`
  const tStart = s.indexOf('template: `');
  if (tStart >= 0) {
    let i = tStart + 'template: `'.length;
    let out = '';
    while (i < s.length) {
      const ch = s[i];
      if (ch === '\\') { out += s[i] + s[i+1]; i += 2; continue; }
      if (ch === '`') break;
      out += ch; i++;
    }
    const end = i + 1;
    fs.writeFileSync(path.join(dir, base + '.html'), out);
    s = s.slice(0, tStart) + "templateUrl: './" + base + ".html'" + s.slice(end);
    console.log('template', base, out.length);
  }
  // Extract styles: [`...`]
  const sStart = s.indexOf('styles: [`');
  if (sStart >= 0) {
    let i = sStart + 'styles: [`'.length;
    let out = '';
    while (i < s.length) {
      const ch = s[i];
      if (ch === '\\') { out += s[i] + s[i+1]; i += 2; continue; }
      if (ch === '`') break;
      out += ch; i++;
    }
    // skip backtick and closing ]
    let end = i + 1;
    if (s[end] === ']') end++;
    fs.writeFileSync(path.join(dir, base + '.scss'), out);
    s = s.slice(0, sStart) + "styleUrl: './" + base + ".scss'" + s.slice(end);
    console.log('styles', base, out.length);
  }
  fs.writeFileSync(p, s);
}
