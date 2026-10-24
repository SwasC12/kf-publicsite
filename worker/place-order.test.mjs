import worker from './index.js';
import crypto from 'node:crypto';

const { privateKey } = await crypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify'],
);
const pkcs8 = await crypto.subtle.exportKey('pkcs8', privateKey);
const b64 = Buffer.from(pkcs8).toString('base64').match(/.{1,64}/g).join('\n');
const pem = '-----BEGIN PRIVATE KEY-----\n' + b64 + '\n-----END PRIVATE KEY-----\n';
const sa = JSON.stringify({ project_id: 'test-project', client_email: 'svc@test.iam.gserviceaccount.com', private_key: pem });

const products = {
  p1: { name: { stringValue: 'Olympea' }, price: { integerValue: '100' }, stockQty: { integerValue: '5' }, inStock: { booleanValue: true }, active: { booleanValue: true }, size: { stringValue: '50ml' } },
  p2: { name: { stringValue: 'Chloe' }, price: { integerValue: '50' }, stockQty: { integerValue: '1' }, inStock: { booleanValue: true }, active: { booleanValue: true } },
  p3: {
    name: { stringValue: 'Sized Scent' }, price: { integerValue: '100' }, inStock: { booleanValue: true }, active: { booleanValue: true },
    sizes: { mapValue: { fields: {
      size30: { mapValue: { fields: { size: { stringValue: '30ml' }, price: { integerValue: '100' }, stockQty: { integerValue: '5' }, inStock: { booleanValue: true } } } },
      size50: { mapValue: { fields: { size: { stringValue: '50ml' }, price: { integerValue: '150' }, stockQty: { integerValue: '2' }, inStock: { booleanValue: true } } } },
      size100: { mapValue: { fields: { size: { stringValue: '100ml' }, price: { integerValue: '250' }, stockQty: { integerValue: '1' }, inStock: { booleanValue: true } } } },
    } } },
  },
};
const settings = {
  deliveryFee: { integerValue: '60' },
  freeDeliveryThreshold: { integerValue: '500' },
  deliveryEnabled: { booleanValue: true },
  collectionEnabled: { booleanValue: true },
  bankAccountNumber: { stringValue: '123456789' },
  bankName: { stringValue: 'Test Bank' },
};
const discount = {
  active: { booleanValue: true }, type: { stringValue: 'percent' }, value: { integerValue: '10' },
  mechanic: { stringValue: 'order' }, usedCount: { integerValue: '0' },
};

let calls = [];
let lastCommit = null;
globalThis.fetch = async function (input, opts) {
  const url = String(input);
  calls.push({ url, opts });
  const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
  if (url.includes('oauth2.googleapis.com/token')) return json({ access_token: 'tok', expires_in: 3600 });
  if (url.includes('/settings/store')) return json({ name: 'settings/store', updateTime: 't1', fields: settings });
  if (url.includes('/products/p1')) return json({ name: 'products/p1', updateTime: 't1', fields: products.p1 });
  if (url.includes('/products/p2')) return json({ name: 'products/p2', updateTime: 't1', fields: products.p2 });
  if (url.includes('/products/p3')) return json({ name: 'products/p3', updateTime: 't1', fields: products.p3 });
  if (url.includes('/discounts/SAVE10')) return json({ name: 'discounts/SAVE10', updateTime: 't1', fields: discount });
  if (url.includes('/discounts/')) return json({ error: { code: 404, message: 'not found', status: 'NOT_FOUND' } }, 404);
  if (url.includes('/orderStatus/')) return json({ error: { code: 404, message: 'not found', status: 'NOT_FOUND' } }, 404);
  if (url.endsWith(':beginTransaction')) return json({ transaction: 'tx1' });
  if (url.endsWith(':commit')) {
    lastCommit = JSON.parse(opts.body);
    return json({ writeResults: [] });
  }
  if (url.includes('identitytoolkit.googleapis.com')) {
    const reqBody = String(opts && opts.body ? opts.body : '');
    if (reqBody.includes('good-token')) return json({ users: [{ localId: 'uid1', email: 'admin@example.com' }] });
    return json({ error: { message: 'INVALID_ID_TOKEN' } }, 400);
  }
  if (url.includes('api.resend.com')) return json({ id: 'email-1' });
  return json({ error: { code: 500, message: 'unexpected ' + url, status: 'INTERNAL' } }, 500);
};

const env = {
  RESEND_API_KEY: 're_test',
  FIREBASE_SERVICE_ACCOUNT: sa,
  ADMIN_API_KEY: 'admin-secret',
  ADMIN_UID: 'uid1',
  FIREBASE_API_KEY: 'web-key',
};

function request(path, body, headers = {}) {
  return new Request('https://kauafragrances.co.za' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

let failures = 0;
function check(label, cond, extra) {
  if (cond) { console.log('PASS', label); }
  else { failures++; console.log('FAIL', label, extra === undefined ? '' : JSON.stringify(extra)); }
}

// 1. Happy path: server ignores client prices and computes the real total.
calls = []; lastCommit = null;
let res = await worker.fetch(request('/api/place-order', {
  contact: { name: 'Test Buyer', email: 'buyer@example.com', phone: '0821234567' },
  delivery: { line1: '1 Main St', city: 'Cape Town', province: 'WC', postalCode: '8001', country: 'South Africa' },
  deliveryMethod: 'delivery',
  items: [{ productId: 'p1', qty: 2, price: 1 }],
  discountCode: 'save10',
  total: 1,
}), env);
let data = await res.json();
check('happy path status 200', res.status === 200, data);
check('server recomputes total 240', data.order && data.order.total === 240, data.order && data.order.total);
check('server recomputes item price 100', data.order && data.order.items[0].price === 100);
check('reference format', data.order && /^KF-[A-Z2-9]{5}$/.test(data.order.reference), data.order && data.order.reference);
check('stock write 5-2=3', !!lastCommit && lastCommit.writes.some((w) => w.update && w.update.fields && w.update.fields.stockQty && w.update.fields.stockQty.integerValue === '3'));
check('discount deferred until paid', !!lastCommit && !lastCommit.writes.some((w) => w.update && w.update.fields && w.update.fields.usedCount));
check('stock reserved on order', data.order && data.order.stockReserved === true);
check('two emails sent', calls.filter((c) => c.url.includes('api.resend.com')).length === 2);

// 1b. A sized product prices and decrements the selected size.
calls = []; lastCommit = null;
res = await worker.fetch(request('/api/place-order', {
  contact: { name: 'Test Buyer', email: 'buyer@example.com', phone: '0821234567' },
  delivery: { line1: '1 Main St', city: 'Cape Town' },
  deliveryMethod: 'delivery',
  items: [{ productId: 'p3', sizeKey: 'size50', qty: 2, price: 1 }],
}), env);
data = await res.json();
check('sized order 200', res.status === 200, data);
check('sized total 360', data.order && data.order.total === 360, data.order && data.order.total);
check('sized item price 150', data.order && data.order.items[0].price === 150);
check('sized item label 50ml', data.order && data.order.items[0].size === '50ml');
const sizeWrite = lastCommit && lastCommit.writes.find((w) => w.update && w.update.fields && w.update.fields.sizes);
check('size stock write 2-2=0', !!sizeWrite && sizeWrite.update.fields.sizes.mapValue.fields.size50.mapValue.fields.stockQty.integerValue === '0');
check('other size stock untouched', !!sizeWrite && sizeWrite.update.fields.sizes.mapValue.fields.size30.mapValue.fields.stockQty.integerValue === '5');

// 1c. Selecting a size with insufficient stock is rejected.
res = await worker.fetch(request('/api/place-order', {
  contact: { name: 'Test Buyer', email: 'buyer@example.com', phone: '0821234567' },
  delivery: { line1: '1 Main St', city: 'Cape Town' },
  deliveryMethod: 'delivery',
  items: [{ productId: 'p3', sizeKey: 'size100', qty: 2 }],
}), env);
data = await res.json();
check('size stock rejection 400', res.status === 400 && /Only 1/.test(data.error || ''), data);

// 2. Insufficient stock is rejected.
res = await worker.fetch(request('/api/place-order', {
  contact: { name: 'Test Buyer', email: 'buyer@example.com', phone: '0821234567' },
  delivery: { line1: '1 Main St', city: 'Cape Town' },
  deliveryMethod: 'delivery',
  items: [{ productId: 'p2', qty: 2 }],
}), env);
data = await res.json();
check('stock rejection 400', res.status === 400, data);
check('stock rejection message', /Only 1/.test(data.error || ''), data.error);

// 3. Invalid promo is rejected.
res = await worker.fetch(request('/api/place-order', {
  contact: { name: 'Test Buyer', email: 'buyer@example.com', phone: '0821234567' },
  delivery: { line1: '1 Main St', city: 'Cape Town' },
  deliveryMethod: 'delivery',
  items: [{ productId: 'p1', qty: 1 }],
  discountCode: 'NOPE',
}), env);
data = await res.json();
check('bad promo 400', res.status === 400 && /not valid/.test(data.error || ''), data);

// 4. Promo validation endpoint.
res = await worker.fetch(request('/api/validate-promo', { code: 'save10', items: [{ productId: 'p1', qty: 2 }] }), env);
data = await res.json();
check('promo endpoint returns discount', res.status === 200 && data.amount === 20, data);

// 5. Blocked origin.
res = await worker.fetch(request('/api/place-order', {}, { Origin: 'https://evil.example' }), env);
check('blocked origin 403', res.status === 403);

// 6. Email endpoint no longer accepts public order/status mail.
res = await worker.fetch(request('/api/send-email', { type: 'order', to: 'victim@example.com' }), env);
check('public order email blocked', res.status === 400);
res = await worker.fetch(request('/api/send-email', { type: 'status', to: 'victim@example.com', reference: 'KF-AAAAA' }), env);
check('public status email blocked', res.status === 403);
res = await worker.fetch(request('/api/send-email', { type: 'welcome', to: 'victim@example.com' }), env);
check('welcome requires auth', res.status === 401);

// 7. Admin app can send status/restock mail with its Firebase ID token.
const adminAuth = { Authorization: ['Bearer', 'good-token'].join(' ') };
res = await worker.fetch(request('/api/send-email', { type: 'status', to: 'buyer@example.com', reference: 'KF-AAAAA', status: 'paid', total: 100 }, adminAuth), env);
check('admin status email allowed', res.status === 200, await res.clone().json());
const badAuth = { Authorization: ['Bearer', 'bad-token'].join(' ') };
res = await worker.fetch(request('/api/send-email', { type: 'restock', to: 'buyer@example.com', productName: 'Olympea' }, badAuth), env);
check('restock rejects non-admin token', res.status === 403, await res.clone().json());

console.log(failures === 0 ? 'ALL TESTS PASSED' : failures + ' TEST(S) FAILED');
process.exit(failures === 0 ? 0 : 1);
