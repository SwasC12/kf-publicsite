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
  p1: { gender: { stringValue: 'Women' }, category: { stringValue: 'Floral' }, name: { stringValue: 'Olympea' }, price: { integerValue: '100' }, stockQty: { integerValue: '5' }, inStock: { booleanValue: true }, active: { booleanValue: true }, size: { stringValue: '50ml' } },
  p2: { name: { stringValue: 'Chloe' }, price: { integerValue: '50' }, stockQty: { integerValue: '1' }, inStock: { booleanValue: true }, active: { booleanValue: true } },
  p3: {
    gender: { stringValue: 'Men' }, category: { stringValue: 'Oud' },
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
let queries = [];
let historyOrders = [];
const I = (n) => ({ integerValue: String(n) });
const B = (b) => ({ booleanValue: b });
const A = (xs) => ({ arrayValue: { values: xs.map((x) => ({ stringValue: x })) } });
const D = (extra) => Object.assign({ active: B(true), type: { stringValue: 'percent' }, value: I(0), mechanic: { stringValue: 'order' }, usedCount: I(0) }, extra);
const extraDiscounts = {
  LATER: D({ value: I(10), startsAt: I(Date.now() + 86400000 * 3) }),
  STARTED: D({ value: I(10), startsAt: I(Date.now() - 1000) }),
  FREESHIP: D({ type: { stringValue: 'fixed' }, value: I(0), freeDelivery: B(true), maxUses: I(50) }),
  B2G1: D({ mechanic: { stringValue: 'bundle' }, bundleQty: I(3), bundleReward: { stringValue: 'free' }, bundleFree: I(1) }),
  B3G1HALF: D({ mechanic: { stringValue: 'bundle' }, bundleQty: I(4), bundleReward: { stringValue: 'free' }, bundleFree: I(1), bundleFreePercent: I(50) }),
  ONLYP1: D({ mechanic: { stringValue: 'item' }, value: I(10), productIds: A(['p1']) }),
  WOMEN: D({ value: I(10), gender: { stringValue: 'women' } }),
  OUD: D({ value: I(10), category: { stringValue: 'oud' } }),
  FIFTY: D({ mechanic: { stringValue: 'item' }, type: { stringValue: 'fixed' }, value: I(20), sizeKeys: A(['size50']) }),
  TWOPLUS: D({ value: I(10), minQty: I(2) }),
  CAPPED: D({ value: I(50), maxDiscount: I(15) }),
  ONCE: D({ value: I(10), oncePerCustomer: B(true) }),
  FIRST: D({ value: I(10), firstOrderOnly: B(true) }),
};
let lastCommit = null;
let patches = [];
let yocoStatus = 'completed';
const S = (v) => ({ stringValue: v });
const orderDocs = {
  ord_shipped: { id: S('ord_shipped'), reference: S('KF-SHIPD'), status: S('shipped'), total: { integerValue: '200' }, yocoCheckoutId: S('ch_1'), paymentMethod: S('yoco') },
  ord_expired: { id: S('ord_expired'), reference: S('KF-EXPRD'), status: S('cancelled'), cancelledReason: S('expired'), total: { integerValue: '200' }, yocoCheckoutId: S('ch_1'), paymentMethod: S('yoco'), customer: { mapValue: { fields: { name: S('Late Payer'), email: S('late@example.com') } } } },
  ord_admincx: { id: S('ord_admincx'), reference: S('KF-ADMCX'), status: S('cancelled'), cancelledReason: S('customer request'), total: { integerValue: '200' }, yocoCheckoutId: S('ch_1'), paymentMethod: S('yoco') },
};
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
  const dm = url.match(/\/discounts\/([A-Z0-9]+)/);
  if (dm && extraDiscounts[dm[1]]) return json({ name: 'discounts/' + dm[1], updateTime: 't1', fields: extraDiscounts[dm[1]] });
  if (url.includes('/discounts/')) return json({ error: { code: 404, message: 'not found', status: 'NOT_FOUND' } }, 404);
  if (url.includes('/orderStatus/')) return json({ error: { code: 404, message: 'not found', status: 'NOT_FOUND' } }, 404);
  if (url.includes('payments.yoco.com/api/checkouts/')) return json({ id: 'ch_1', status: yocoStatus });
  if (url.includes('payments.yoco.com/api/checkouts')) return json({ id: 'ch_1', redirectUrl: 'https://pay.yoco.com/c/ch_1' });
  if (opts && opts.method === 'PATCH') { patches.push({ url, body: JSON.parse(opts.body) }); return json({}); }
  if (url.includes(':runQuery')) {
    const q = JSON.parse(opts.body);
    queries.push(q);
    const ff = q.structuredQuery.where.fieldFilter;
    if (q.structuredQuery.from[0].collectionId !== 'orders') return json([]);
    const want = ff.value.stringValue;
    const rows = historyOrders.filter((o) => (ff.field.fieldPath === 'uid' ? o.uid === want : o.email === want));
    return json(rows.map((o) => ({ document: { name: 'x/orders/' + o.id, fields: {
      id: S(o.id), status: S(o.status), discountCode: o.code ? S(o.code) : { nullValue: null },
      uid: o.uid ? S(o.uid) : { nullValue: null },
      customer: { mapValue: { fields: { email: S(o.email || '') } } },
    } } })));
  }
  const od = url.match(/\/orders\/(ord_[a-z]+)/);
  if (od && orderDocs[od[1]]) return json({ name: 'orders/' + od[1], updateTime: 't1', fields: orderDocs[od[1]] });
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
  YOCO_SECRET_KEY: 'sk_test_x',
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
check('promo use reserved at placement', !!lastCommit && lastCommit.writes.some((w) => w.update && w.update.fields && w.update.fields.usedCount && w.update.fields.usedCount.integerValue === '1'));
check('card checkout redirect returned', data.redirectUrl === 'https://pay.yoco.com/c/ch_1', data.redirectUrl);
check('order is card (yoco)', data.order && data.order.paymentMethod === 'yoco');
check('stock reserved on order', data.order && data.order.stockReserved === true);
check('no emails before payment', calls.filter((c) => c.url.includes('api.resend.com')).length === 0);
check('writes omit HTTP prefix', !!lastCommit && lastCommit.writes.filter((w) => w.update && w.update.name).every((w) => !w.update.name.startsWith('http')));

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

// 8. Splitting one product across lines can't beat the stock check (p2 has 1 left).
res = await worker.fetch(request('/api/place-order', {
  contact: { name: 'Test Buyer', email: 'split@example.com', phone: '0821234567' },
  delivery: { line1: '1 Main St', city: 'Cape Town' },
  deliveryMethod: 'delivery', paymentMethod: 'eft',
  items: [{ productId: 'p2', qty: 1 }, { productId: 'p2', qty: 1 }],
}), env);
data = await res.json();
check('split lines rejected 400', res.status === 400 && /Only 1/.test(data.error || ''), data);

// 9. The promo check no longer leaks usage counters.
res = await worker.fetch(request('/api/validate-promo', { code: 'save10', items: [{ productId: 'p1', qty: 1 }] }), env);
data = await res.json();
check('promo response hides usedCount', res.status === 200 && data.discount && !('usedCount' in data.discount), data.discount);

// 10. confirm-payment can't drag a shipped order back to "paid".
calls = []; lastCommit = null; patches = [];
res = await worker.fetch(request('/api/confirm-payment', { orderId: 'ord_shipped' }), env);
data = await res.json();
check('shipped order stays shipped', data.status === 'shipped' && !lastCommit, data);
check('no payment email for shipped order', calls.filter((c) => c.url.includes('api.resend.com')).length === 0);

// 11. A late payment on an expired checkout revives the order.
calls = []; lastCommit = null; patches = [];
res = await worker.fetch(request('/api/confirm-payment', { orderId: 'ord_expired' }), env);
data = await res.json();
const revive = lastCommit && lastCommit.writes[0].update.fields;
check('expired + paid -> paid', data.status === 'paid' && revive && revive.status.stringValue === 'paid', data);
check('revived order flagged', !!revive && revive.revivedAfterExpiry && revive.revivedAfterExpiry.booleanValue === true);

// 12. Payment on an order the admin cancelled is flagged, not revived.
calls = []; lastCommit = null; patches = [];
res = await worker.fetch(request('/api/confirm-payment', { orderId: 'ord_admincx' }), env);
data = await res.json();
check('admin-cancelled stays cancelled', data.status === 'cancelled' && !lastCommit, data);
check('admin-cancelled payment flagged', patches.some((x) => x.url.includes('/orders/ord_admincx') && x.body.fields.paymentReceivedWhileCancelled), patches.map((x) => x.url));

// ---------- New discount options ----------
let ipN = 0;
const freshIp = () => ({ 'CF-Connecting-IP': '10.0.0.' + (++ipN) });
let mailN = 0;
async function order(code, items, extra = {}) {
  calls = []; lastCommit = null; queries = [];
  const r = await worker.fetch(request('/api/place-order', {
    contact: { name: 'Test Buyer', email: extra.email || ('promo' + (++mailN) + '@example.com'), phone: '0821234567' },
    delivery: { line1: '1 Main St', city: 'Cape Town' },
    deliveryMethod: extra.method || 'delivery',
    items, discountCode: code,
  }, { ...freshIp(), ...(extra.headers || {}) }), env);
  return { res: r, data: await r.json() };
}
async function promo(code, items, headers = {}) {
  const r = await worker.fetch(request('/api/validate-promo', { code, items }, { ...freshIp(), ...headers }), env);
  return { res: r, data: await r.json() };
}
const usedCountWritten = () => !!lastCommit && lastCommit.writes.some((w) => w.update && w.update.fields && w.update.fields.usedCount);
let o, v;

// 13. Start date.
v = await promo('later', [{ productId: 'p1', qty: 1 }]);
check('startsAt: promo not valid yet', v.res.status === 400 && /only valid from \d+ [A-Z][a-z]{2} \d{4}/.test(v.data.error || ''), v.data);
o = await order('LATER', [{ productId: 'p1', qty: 1 }]);
check('startsAt: order rejected before start', o.res.status === 400 && /only valid from/.test(o.data.error || ''), o.data);
o = await order('STARTED', [{ productId: 'p1', qty: 1 }]);
check('startsAt: valid once started (100-10+60=150)', o.res.status === 200 && o.data.order.total === 150, o.data);

// 14. Free delivery.
v = await promo('freeship', [{ productId: 'p1', qty: 1 }]);
check('free delivery: promo accepted with amount 0', v.res.status === 200 && v.data.amount === 0 && v.data.discount.freeDelivery === true, v.data);
check('free delivery: public discount hides maxUses/usedCount', v.res.status === 200 && !('maxUses' in v.data.discount) && !('usedCount' in v.data.discount), v.data.discount);
o = await order('FREESHIP', [{ productId: 'p1', qty: 1 }]);
check('free delivery: fee 0, total 100', o.res.status === 200 && o.data.order.deliveryFee === 0 && o.data.order.total === 100, o.data.order);
check('free delivery: waived fee recorded', o.data.order && o.data.order.deliveryDiscount === 60 && o.data.order.discountCode === 'FREESHIP', o.data.order);
check('free delivery: use counted', usedCountWritten() && o.data.order.discountCounted === true);
o = await order('FREESHIP', [{ productId: 'p1', qty: 1 }], { method: 'collection' });
check('free delivery on collection: nothing to waive, use not counted', o.res.status === 200 && o.data.order.total === 100 && !usedCountWritten() && !o.data.order.discountCode, o.data.order);

// 15. Buy X get Y.
o = await order('B2G1', [{ productId: 'p1', qty: 3 }]);
check('buy 2 get 1 free: 300-100+60=260', o.res.status === 200 && o.data.order.discountAmount === 100 && o.data.order.total === 260, o.data);
o = await order('B3G1HALF', [{ productId: 'p1', qty: 4 }]);
check('buy 3 get 1 half price: 50 off', o.res.status === 200 && o.data.order.discountAmount === 50, o.data);
v = await promo('b2g1', [{ productId: 'p1', qty: 2 }]);
check('buy 2 get 1: needs 3 items', v.res.status === 400 && /at least 3 items/.test(v.data.error || ''), v.data);

// 16. Targeting.
o = await order('ONLYP1', [{ productId: 'p1', qty: 1 }, { productId: 'p3', sizeKey: 'size30', qty: 1 }]);
check('products: only p1 discounted (10)', o.res.status === 200 && o.data.order.discountAmount === 10, o.data);
v = await promo('onlyp1', [{ productId: 'p3', sizeKey: 'size30', qty: 1 }]);
check('products: other items rejected', v.res.status === 400 && /isn't valid for the items/.test(v.data.error || ''), v.data);
o = await order('WOMEN', [{ productId: 'p1', qty: 1 }, { productId: 'p3', sizeKey: 'size30', qty: 1 }]);
check('gender: order % on women items only (10)', o.res.status === 200 && o.data.order.discountAmount === 10, o.data);
v = await promo('oud', [{ productId: 'p1', qty: 1 }, { productId: 'p3', sizeKey: 'size50', qty: 1 }]);
check('category: oud line only (15)', v.res.status === 200 && v.data.amount === 15 && v.data.products && v.data.products.p3.category === 'Oud', v.data);
o = await order('FIFTY', [{ productId: 'p3', sizeKey: 'size50', qty: 1 }, { productId: 'p3', sizeKey: 'size30', qty: 1 }]);
check('size: only the 50ml discounted (20)', o.res.status === 200 && o.data.order.discountAmount === 20, o.data);
v = await promo('fifty', [{ productId: 'p1', qty: 1 }]);
check('size: unsized 50ml product label matches', v.res.status === 200 && v.data.amount === 20, v.data);

// 17. Minimum quantity.
v = await promo('twoplus', [{ productId: 'p1', qty: 1 }]);
check('min qty: 1 item rejected', v.res.status === 400 && /at least 2 items/.test(v.data.error || ''), v.data);
v = await promo('twoplus', [{ productId: 'p1', qty: 2 }]);
check('min qty: 2 items ok', v.res.status === 200 && v.data.amount === 20, v.data);

// 18. Cap.
o = await order('CAPPED', [{ productId: 'p1', qty: 1 }]);
check('cap: 50% capped at R15', o.res.status === 200 && o.data.order.discountAmount === 15 && o.data.order.total === 145, o.data);

// 19. Once per customer.
historyOrders = [
  { id: 'h1', email: 'used@example.com', status: 'paid', code: 'ONCE' },
  { id: 'h2', email: 'cancelled@example.com', status: 'cancelled', code: 'ONCE' },
  { id: 'h3', uid: 'uid1', email: 'admin@example.com', status: 'delivered', code: 'SAVE10' },
  { id: 'h4', email: 'pendingonly@example.com', status: 'pending', code: '' },
];
v = await promo('once', [{ productId: 'p1', qty: 1 }]);
check('once: signed-out promo check asks to sign in', v.res.status === 400 && /sign in/i.test(v.data.error || ''), v.data);
v = await promo('once', [{ productId: 'p1', qty: 1 }], adminAuth);
check('once: signed-in customer who never used it is ok', v.res.status === 200 && v.data.amount === 10, v.data);
o = await order('ONCE', [{ productId: 'p1', qty: 1 }], { email: 'used@example.com' });
check('once: second use by email rejected', o.res.status === 400 && /already used/.test(o.data.error || ''), o.data);
check('once: history read inside the transaction', queries.length > 0 && queries.every((q) => q.transaction === 'tx1'), queries.map((q) => q.transaction));
o = await order('ONCE', [{ productId: 'p1', qty: 1 }], { email: 'USED@example.com' });
check('once: email match ignores case', o.res.status === 400 && /already used/.test(o.data.error || ''), o.data);
o = await order('ONCE', [{ productId: 'p1', qty: 1 }], { email: 'cancelled@example.com' });
check('once: a cancelled earlier use does not count', o.res.status === 200, o.data);
historyOrders.push({ id: 'h5', uid: 'uid1', email: 'other@example.com', status: 'pending', code: 'ONCE' });
o = await order('ONCE', [{ productId: 'p1', qty: 1 }], { email: 'fresh@example.com', headers: adminAuth });
check('once: matched by signed-in uid too', o.res.status === 400 && /already used/.test(o.data.error || ''), o.data);

// 20. First order only.
o = await order('FIRST', [{ productId: 'p1', qty: 1 }], { email: 'used@example.com' });
check('first order: customer with a paid order rejected', o.res.status === 400 && /first order/.test(o.data.error || ''), o.data);
o = await order('FIRST', [{ productId: 'p1', qty: 1 }], { email: 'pendingonly@example.com' });
check('first order: unpaid history only is ok', o.res.status === 200 && o.data.order.discountAmount === 10, o.data);
v = await promo('first', [{ productId: 'p1', qty: 1 }], adminAuth);
check('first order: signed-in customer with delivered order rejected', v.res.status === 400 && /first order/.test(v.data.error || ''), v.data);
historyOrders = [];

// 21. Old codes are unchanged (no new fields -> same result as before).
v = await promo('save10', [{ productId: 'p1', qty: 1 }, { productId: 'p3', sizeKey: 'size30', qty: 1 }]);
check('old code: 10% of whole cart', v.res.status === 200 && v.data.amount === 20, v.data);

console.log(failures === 0 ? 'ALL TESTS PASSED' : failures + ' TEST(S) FAILED');
process.exit(failures === 0 ? 0 : 1);
