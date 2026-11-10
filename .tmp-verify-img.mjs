const urls=[
'https://res.cloudinary.com/dpuvlgxsa/image/upload/v1793915344/kaua/placeholders/kaua/placeholders/men30.svg',
'https://res.cloudinary.com/dpuvlgxsa/image/upload/v1793915350/kaua/placeholders/kaua/placeholders/women30.svg'
];
for (const u of urls) {
  try { const r = await fetch(u); console.log(r.status, r.headers.get('content-type'), u.split('/').pop()); }
  catch (e) { console.log('ERR', e.message); }
}
