const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const form=new FormData();
form.append('file',png);
form.append('upload_preset','kaua_unsigned');
form.append('folder','kaua/test');
const r=await fetch('https://api.cloudinary.com/v1_1/dpuvlgxsa/image/upload',{method:'POST',body:form});
const t=await r.text();
console.log('status',r.status);
console.log(t.slice(0,300));
