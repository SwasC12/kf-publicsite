// Cloudflare Worker for Kauā Fragrances.
// - Serves the static Angular app (via the ASSETS binding).
// - POST /api/send-email sends transactional emails via Resend.
//   The RESEND_API_KEY is a Worker secret (never exposed to the browser).

const FROM_HELLO = 'Kauā Fragrances <hello@kauafragrances.co.za>';
const FROM_ORDERS = 'Kauā Fragrances <orders@kauafragrances.co.za>';
const ORDERS_INBOX = 'orders@kauafragrances.co.za';
const SITE_URL = 'https://kauafragrances.co.za';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/send-email') {
      if (request.method === 'OPTIONS') return cors(new Response(null, { status: 204 }), request);
      if (request.method !== 'POST') return cors(json({ error: 'Method not allowed' }, 405), request);
      return cors(await handleSend(request, env), request);
    }
    return env.ASSETS.fetch(request);
  },
};

async function handleSend(request, env) {
  if (!env.RESEND_API_KEY) return json({ error: 'Email not configured' }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Bad request' }, 400);
  }

  const to = String(body.to || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return json({ error: 'Invalid recipient' }, 400);
  const name = clip(body.name, 80) || 'there';

  try {
    if (body.type === 'welcome') {
      await sendEmail(env, { from: FROM_HELLO, to, replyTo: 'hello@kauafragrances.co.za',
        subject: 'Welcome to Kauā Fragrances', html: welcomeHtml(name) });
      return json({ ok: true });
    }

    if (body.type === 'restock') {
      const product = clip(body.productName, 80) || 'A fragrance you wanted';
      await sendEmail(env, { from: FROM_HELLO, to, replyTo: 'hello@kauafragrances.co.za',
        subject: `Back in stock: ${product}`, html: restockHtml(product) });
      return json({ ok: true });
    }

    if (body.type === 'status') {
      const ref = clip(body.reference, 20) || 'KF-';
      const st = body.status === 'fulfilled' ? 'fulfilled' : 'paid';
      const subject = st === 'paid'
        ? `Payment received — order ${ref}` : `Your order ${ref} is on its way`;
      await sendEmail(env, { from: FROM_ORDERS, to, replyTo: 'orders@kauafragrances.co.za',
        subject, html: statusHtml(name, ref, st, Number(body.total) || 0) });
      return json({ ok: true });
    }

    if (body.type === 'order') {
      const order = normalizeOrder(body.order);
      if (!order) return json({ error: 'Invalid order' }, 400);
      // Confirmation to the customer…
      await sendEmail(env, { from: FROM_ORDERS, to, replyTo: 'orders@kauafragrances.co.za',
        subject: `Order ${order.reference} received — Kauā Fragrances`, html: orderHtml(name, order, true) });
      // …and a heads-up to the shop.
      await sendEmail(env, { from: FROM_ORDERS, to: ORDERS_INBOX, replyTo: to,
        subject: `New order ${order.reference} — ${money(order.total)}`, html: orderHtml(name, order, false, to, body.phone) });
      return json({ ok: true });
    }

    return json({ error: 'Unknown type' }, 400);
  } catch (e) {
    return json({ error: 'Send failed', detail: String(e) }, 502);
  }
}

async function sendEmail(env, { from, to, subject, html, replyTo }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html, reply_to: replyTo }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
}

function normalizeOrder(o) {
  if (!o || typeof o !== 'object') return null;
  const items = Array.isArray(o.items) ? o.items.slice(0, 50).map((i) => ({
    name: clip(i.name, 120), size: clip(i.size, 40), qty: Number(i.qty) || 0, price: Number(i.price) || 0,
  })) : [];
  return {
    reference: clip(o.reference, 20) || 'KF-',
    total: Number(o.total) || 0,
    items,
    delivery: o.delivery ? clip(addressLine(o.delivery), 300) : '',
  };
}

// ---------- templates ----------
function shell(inner) {
  return `<div style="font-family:Segoe UI,system-ui,Arial,sans-serif;max-width:560px;margin:0 auto;color:#141210">
    <div style="text-align:center;padding:22px 0">
      <img src="${SITE_URL}/logo-mark.png" alt="Kauā Fragrances" width="70" height="70" style="object-fit:contain" />
      <div style="font-weight:800;letter-spacing:3px;font-size:18px;margin-top:6px">KAUĀ FRAGRANCES</div>
      <div style="font-style:italic;color:#7d766c;font-size:13px">"one spray to last the day"</div>
    </div>
    <div style="border:1px solid #e5e1d9;border-radius:14px;padding:24px">${inner}</div>
    <p style="text-align:center;color:#9a9086;font-size:12px;margin-top:18px">Kauā Fragrances · ${SITE_URL}</p>
  </div>`;
}

function restockHtml(product) {
  return shell(`
    <h1 style="font-size:22px;margin:0 0 10px">It's back 🖤</h1>
    <p style="line-height:1.6;color:#3b352f"><strong>${esc(product)}</strong> is back in stock at Kauā Fragrances.
      These move fast — grab yours before it's gone.</p>
    <p style="margin-top:18px"><a href="${SITE_URL}" style="background:#141210;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;display:inline-block">Shop now</a></p>`);
}

function statusHtml(name, reference, status, total) {
  if (status === 'paid') {
    return shell(`
      <h1 style="font-size:22px;margin:0 0 8px">Payment received ✓</h1>
      <p style="line-height:1.6;color:#3b352f">Thanks, ${esc(name)} — we've received your payment for order
        <strong>${esc(reference)}</strong>${total ? ` (${money(total)})` : ''}. We're getting it ready and will let you know when it's on its way.</p>`);
  }
  return shell(`
    <h1 style="font-size:22px;margin:0 0 8px">Your order is on its way 🖤</h1>
    <p style="line-height:1.6;color:#3b352f">Good news, ${esc(name)} — order <strong>${esc(reference)}</strong> has been dispatched.
      Thank you for choosing Kauā Fragrances. One spray to last the day.</p>`);
}

function welcomeHtml(name) {
  return shell(`
    <h1 style="font-size:22px;margin:0 0 12px">Welcome, ${esc(name)} 🖤</h1>
    <p style="line-height:1.6;color:#3b352f">Thanks for creating an account at Kauā Fragrances. You can now check out faster and track your orders.</p>
    <p style="line-height:1.6;color:#3b352f">Inspired-by fragrance oils, long-lasting and beautifully made — one spray to last the day.</p>
    <p style="margin-top:20px"><a href="${SITE_URL}" style="background:#141210;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;display:inline-block">Browse fragrances</a></p>`);
}

function orderHtml(name, order, forCustomer, customerEmail, phone) {
  const rows = order.items.map((i) =>
    `<tr><td style="padding:7px 0;border-bottom:1px solid #eee">${i.qty} × ${esc(i.name)}${i.size ? ` <span style="color:#7d766c">(${esc(i.size)})</span>` : ''}</td>
     <td style="padding:7px 0;border-bottom:1px solid #eee;text-align:right">${money(i.price * i.qty)}</td></tr>`).join('');
  const itemsTable = `<table style="width:100%;border-collapse:collapse;margin:14px 0">${rows}
    <tr><td style="padding:10px 0;font-weight:800">Total</td><td style="padding:10px 0;text-align:right;font-weight:800">${money(order.total)}</td></tr></table>`;

  if (forCustomer) {
    return shell(`
      <h1 style="font-size:22px;margin:0 0 8px">Thanks, ${esc(name)}!</h1>
      <p style="line-height:1.6;color:#3b352f">We've received your order. Your payment reference is:</p>
      <div style="text-align:center;border:2px dashed #141210;border-radius:12px;padding:14px;margin:14px 0">
        <div style="font-size:24px;font-weight:800;letter-spacing:2px">${esc(order.reference)}</div>
        <div style="font-size:12px;color:#7d766c">Use this reference on your EFT so we can match your payment.</div>
      </div>
      ${itemsTable}
      ${order.delivery ? `<p style="color:#7d766c;font-size:14px"><strong>Deliver to:</strong> ${esc(order.delivery)}</p>` : ''}
      <p style="line-height:1.6;color:#3b352f">Please pay <strong>${money(order.total)}</strong> by EFT using reference <strong>${esc(order.reference)}</strong>. Banking details are on the order page — reply to this email if you need them again. Once we confirm payment we'll arrange delivery.</p>`);
  }
  return shell(`
    <h1 style="font-size:20px;margin:0 0 8px">New order ${esc(order.reference)}</h1>
    <p style="color:#3b352f"><strong>${esc(name)}</strong> — ${esc(customerEmail || '')}${phone ? ` · ${esc(String(phone))}` : ''}</p>
    ${itemsTable}
    ${order.delivery ? `<p style="color:#7d766c;font-size:14px"><strong>Deliver to:</strong> ${esc(order.delivery)}</p>` : ''}
    <p style="color:#7d766c;font-size:13px">Awaiting EFT with reference ${esc(order.reference)}.</p>`);
}

// ---------- helpers ----------
function addressLine(d) {
  return [d.line1, d.line2, d.city, d.province, d.postalCode, d.country].filter(Boolean).join(', ');
}
function money(v) { return 'R' + (Number(v) || 0).toFixed(2).replace(/\.00$/, ''); }
function clip(s, n) { return typeof s === 'string' ? s.slice(0, n) : ''; }
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}
function cors(res, request) {
  const o = request.headers.get('Origin');
  if (o) {
    res.headers.set('Access-Control-Allow-Origin', o);
    res.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    res.headers.set('Vary', 'Origin');
  }
  return res;
}
