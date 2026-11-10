const base='https://kauafragrances.co.za';
const r = await fetch(base+'/referrals');
console.log('route /referrals', r.status, (await r.text()).length);
const html = await (await fetch(base+'/')).text();
const js = (html.match(/src="([^"]*main[^"]*\.js)"/)||[])[1];
if (js) {
  const code = await (await fetch(base+'/'+js.replace(/^\//,''))).text();
  console.log(js.split('/').pop(), '| referral page copy', code.includes('Earn a free 30 ml'), '| nav link', code.includes('Refer a friend'));
}
