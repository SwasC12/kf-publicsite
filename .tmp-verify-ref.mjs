const base='https://kauafragrances.co.za';
const html = await (await fetch(base+'/')).text();
const js = (html.match(/src="([^"]*main[^"]*\.js)"/)||[])[1];
const code = js ? await (await fetch(base+'/'+js.replace(/^\//,''))).text() : '';
console.log(js && js.split('/').pop(), '| unique-people copy', /people have used your code/.test(code), '| three different people', /three different people/i.test(code));
