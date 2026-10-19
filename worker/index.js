// Cloudflare Worker for Kauā Fragrances.
// - Serves the static Angular app (via the ASSETS binding).
// - POST /api/send-email sends transactional emails via Resend.
//   The RESEND_API_KEY is a Worker secret (never exposed to the browser).

const FROM_HELLO = 'Kauā Fragrances <hello@kauafragrances.co.za>';
const FROM_ORDERS = 'Kauā Fragrances <orders@kauafragrances.co.za>';
const ORDERS_INBOX = 'orders@kauafragrances.co.za';
const SITE_URL = 'https://kauafragrances.co.za';

const DEFAULT_ORIGINS = ["https://kauafragrances.co.za", "https://www.kauafragrances.co.za"];

function allowedOrigins(env) {
  const list = String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(function (s) { return s.trim(); })
    .filter(Boolean);
  return list.length ? list : DEFAULT_ORIGINS;
}

function originAllowed(origin, env) {
  if (!origin) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return allowedOrigins(env).indexOf(origin) !== -1;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.indexOf("/api/") === 0) {
      if (request.method === "OPTIONS") return cors(new Response(null, { status: 204 }), request);
      const origin = request.headers.get("Origin");
      if (!originAllowed(origin, env)) return json({ error: "Origin not allowed" }, 403);
      if (request.method !== "POST") return cors(json({ error: "Method not allowed" }, 405), request);
      if (url.pathname === "/api/place-order") return cors(await handlePlaceOrder(request, env), request);
      if (url.pathname === "/api/validate-promo") return cors(await handleValidatePromo(request, env), request);
      if (url.pathname === "/api/send-email") return cors(await handleSend(request, env), request);
      return cors(json({ error: "Not found" }, 404), request);
    }
    return withSecurityHeaders(await env.ASSETS.fetch(request));
  },
};

const CSP = "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; " +
  "img-src 'self' data: blob: https://res.cloudinary.com https://firebasestorage.googleapis.com https://*.googleusercontent.com; " +
  "media-src 'self' https://res.cloudinary.com; script-src 'self'; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; " +
  "connect-src 'self' https://*.googleapis.com https://*.google.com https://*.firebaseio.com https://*.cloudfunctions.net; " +
  "worker-src 'self' blob:; manifest-src 'self'; upgrade-insecure-requests";

function withSecurityHeaders(res) {
  const headers = new Headers(res.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  headers.set("Content-Security-Policy", CSP);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: headers });
}

const rateBuckets = new Map();

function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") ||
    (request.headers.get("X-Forwarded-For") || "").split(",")[0].trim() || "unknown";
}

function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const hits = (rateBuckets.get(key) || []).filter(function (t) { return now - t < windowMs; });
  if (hits.length >= max) { rateBuckets.set(key, hits); return false; }
  hits.push(now);
  rateBuckets.set(key, hits);
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) { if (!v.length || now - v[v.length - 1] > windowMs) rateBuckets.delete(k); }
  }
  return true;
}

async function verifyIdToken(env, idToken) {
  const key = env.FIREBASE_API_KEY || env.FIREBASE_WEB_API_KEY;
  if (!key || !idToken) return null;
  try {
    const res = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + encodeURIComponent(key), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: idToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.users && data.users[0] ? data.users[0] : null;
  } catch (e) {
    return null;
  }
}

async function handleSend(request, env) {
  if (!env.RESEND_API_KEY) return json({ error: "Email not configured" }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Bad request" }, 400);
  }

  const type = String(body.type || "");
  const to = String(body.to || "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return json({ error: "Invalid recipient" }, 400);
  const name = clip(body.name, 80) || "there";

  if (type === "welcome") {
    // A welcome email may only be sent to the account that just signed in.
    const auth = request.headers.get("Authorization") || "";
    const token = auth.indexOf("Bearer ") === 0 ? auth.slice(7) : "";
    if (!token) return json({ error: "Sign-in required" }, 401);
    if (!rateLimit("welcome:" + clientIp(request), 5, 3600000)) return json({ error: "Too many requests" }, 429);
    const user = await verifyIdToken(env, token);
    if (!user || !user.email || String(user.email).toLowerCase() !== to.toLowerCase()) {
      return json({ error: "Recipient does not match the signed-in account" }, 403);
    }
    try {
      await sendEmail(env, { from: FROM_HELLO, to, replyTo: "hello@kauafragrances.co.za",
        subject: "Welcome to Kauā Fragrances", html: welcomeHtml(name) });
      return json({ ok: true });
    } catch (e) {
      return json({ error: "Send failed" }, 502);
    }
  }

  if (type === "status") {
    // Order-status mail is an admin action, never a public one.
    const key = request.headers.get("x-admin-key") || "";
    if (!env.ADMIN_API_KEY || key !== env.ADMIN_API_KEY) return json({ error: "Forbidden" }, 403);
    const ref = clip(body.reference, 20) || "KF-";
    const st = body.status === "fulfilled" ? "fulfilled" : "paid";
    const subject = st === "paid"
      ? "Payment received — order " + ref : "Your order " + ref + " is on its way";
    try {
      await sendEmail(env, { from: FROM_ORDERS, to, replyTo: "orders@kauafragrances.co.za",
        subject: subject, html: statusHtml(name, ref, st, Number(body.total) || 0) });
      return json({ ok: true });
    } catch (e) {
      return json({ error: "Send failed" }, 502);
    }
  }

  // Order emails are sent internally by /api/place-order after the order is saved.
  return json({ error: "Unsupported email type" }, 400);
}

// ---------- Order placement (server-side, authoritative pricing) ----------

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function sleep(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

async function handleValidatePromo(request, env) {
  if (!env.FIREBASE_SERVICE_ACCOUNT) {
    return json({ error: "Promo codes are temporarily unavailable." }, 503);
  }
  if (!rateLimit("promo:" + clientIp(request), 30, 60000)) {
    return json({ error: "Too many attempts. Please wait a minute." }, 429);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Bad request" }, 400);
  }
  const code = String(body.code || "").trim().toUpperCase().slice(0, 40);
  if (!code) return json({ error: "Enter a code first." }, 400);
  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (!rawItems.length || rawItems.length > 50) return json({ error: "Your cart is empty." }, 400);

  try {
    const fs = new Firestore(env);
    const lines = [];
    for (const raw of rawItems) {
      const productId = String(raw.productId || "").trim();
      const qty = Math.floor(Number(raw.qty));
      if (!productId || !isFinite(qty) || qty < 1 || qty > 99) {
        return json({ error: "One of the cart items is invalid." }, 400);
      }
      const doc = await fs.get("products/" + productId);
      if (!doc) return json({ error: "One of the items in your cart is no longer available." }, 400);
      lines.push({ unitPrice: effectivePrice(doc.data), qty: qty });
    }
    const doc = await fs.get("discounts/" + code);
    if (!doc) return json({ error: "That code is not valid." }, 400);
    const discount = Object.assign({ code: code }, doc.data);
    const err = discountError(discount, lines, "online");
    if (err) return json({ error: err }, 400);
    return json({ ok: true, discount: discount, amount: computeDiscount(discount, lines) });
  } catch (e) {
    return json({ error: "Could not check that code. Please try again." }, 500);
  }
}

async function handlePlaceOrder(request, env) {
  if (!env.FIREBASE_SERVICE_ACCOUNT) {
    return json({ error: "Online ordering is temporarily unavailable. Please contact us." }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Bad request" }, 400);
  }

  const contact = body.contact || {};
  const delivery = body.delivery || {};
  const method = body.deliveryMethod === "collection" ? "collection" : "delivery";
  const rawItems = Array.isArray(body.items) ? body.items : [];
  const name = String(contact.name || "").trim().slice(0, 120);
  const email = String(contact.email || "").trim().slice(0, 200);
  const phone = String(contact.phone || "").trim().slice(0, 40);
  const note = String(contact.note || "").trim().slice(0, 1000);

  if (!name) return json({ error: "Please enter your full name." }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Please enter a valid email address." }, 400);
  if (!phone) return json({ error: "Please enter a phone number." }, 400);
  if (!rawItems.length || rawItems.length > 50) return json({ error: "Your cart is empty." }, 400);
  if (method === "delivery" && (!String(delivery.line1 || "").trim() || !String(delivery.city || "").trim())) {
    return json({ error: "Please enter your delivery address." }, 400);
  }

  const items = [];
  for (const raw of rawItems) {
    const productId = String(raw.productId || "").trim();
    const qty = Math.floor(Number(raw.qty));
    if (!productId || !isFinite(qty) || qty < 1 || qty > 99) {
      return json({ error: "One of the cart items is invalid." }, 400);
    }
    items.push({ productId: productId, qty: qty });
  }

  let uid = null;
  const auth = request.headers.get("Authorization") || "";
  if (auth.indexOf("Bearer ") === 0) {
    const user = await verifyIdToken(env, auth.slice(7));
    if (user) uid = user.localId || null;
  }

  try {
    const result = await new Firestore(env).placeOrder({
      name: name,
      email: email,
      phone: phone,
      note: note,
      delivery: delivery,
      method: method,
      items: items,
      code: String(body.discountCode || "").trim().toUpperCase().slice(0, 40),
      uid: uid,
    });
    try {
      await sendOrderEmails(env, result.order, result.settings);
    } catch (e) {
      // The order is saved; email is best-effort.
    }
    return json({ ok: true, order: result.order });
  } catch (e) {
    if (e && e.status) return json({ error: e.message }, e.status);
    return json({ error: "Sorry, we could not place your order. Please try again." }, 500);
  }
}

function b64url(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function importPrivateKey(pem) {
  const clean = String(pem || "").replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const bin = atob(clean);
  const der = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) der[i] = bin.charCodeAt(i);
  return crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
}

class Firestore {
  constructor(env) {
    this.env = env;
    this.sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
    this.project = env.FIREBASE_PROJECT_ID || this.sa.project_id;
    this.root = "https://firestore.googleapis.com/v1/projects/" + this.project + "/databases/(default)/documents";
    this.token = null;
    this.tokenExp = 0;
    this.key = null;
  }

  async accessToken() {
    const now = Math.floor(Date.now() / 1000);
    if (this.token && now < this.tokenExp - 60) return this.token;
    if (!this.key) this.key = await importPrivateKey(this.sa.private_key);
    const enc = function (obj) { return b64url(new TextEncoder().encode(JSON.stringify(obj))); };
    const unsigned = enc({ alg: "RS256", typ: "JWT" }) + "." + enc({
      iss: this.sa.client_email,
      scope: "https://www.googleapis.com/auth/datastore",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    });
    const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", this.key, new TextEncoder().encode(unsigned));
    const jwt = unsigned + "." + b64url(new Uint8Array(sig));
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=" + encodeURIComponent(jwt),
    });
    const data = await res.json().catch(function () { return {}; });
    if (!res.ok || !data.access_token) throw httpError(503, "Ordering is temporarily unavailable.");
    this.token = data.access_token;
    this.tokenExp = now + (Number(data.expires_in) || 3600);
    return this.token;
  }

  async call(path, opts) {
    const token = await this.accessToken();
    const url = path.charAt(0) === ":" ? this.root + path : this.root + "/" + path;
    const res = await fetch(url, {
      method: (opts && opts.method) || "GET",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: opts && opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    if (!res.ok) {
      const msg = data && data.error && data.error.message ? data.error.message : "Firestore " + res.status;
      const err = new Error(msg);
      err.status = res.status;
      err.code = data && data.error ? data.error.status : "";
      throw err;
    }
    return data;
  }

  async begin() {
    const data = await this.call(":beginTransaction", { method: "POST", body: {} });
    return data.transaction;
  }

  async get(path, tx) {
    const query = tx ? "?transaction=" + encodeURIComponent(tx) : "";
    try {
      const data = await this.call(path + query);
      return { data: fromFs(data), updateTime: data.updateTime, name: data.name };
    } catch (e) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  async commit(tx, writes) {
    await this.call(":commit", { method: "POST", body: { transaction: tx, writes: writes } });
  }

  async placeOrder(input) {
    let last = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const tx = await this.begin();
      try {
        return await this.placeOrderTx(tx, input);
      } catch (e) {
        last = e;
        const retry = e.status === 409 || e.code === "ABORTED" ||
          (e.status === 400 && /precondition|transaction/i.test(String(e.message || "")));
        if (!retry) throw e;
        await sleep(70 + attempt * 90);
      }
    }
    throw httpError(503, "The shop is busy right now — please try again.");
  }

  async placeOrderTx(tx, input) {
    const settingsDoc = await this.get("settings/store", tx);
    const settings = settingsDoc ? settingsDoc.data : {};
    const cfg = Object.assign({
      deliveryEnabled: true,
      collectionEnabled: true,
      deliveryFee: 60,
      freeDeliveryThreshold: 500,
    }, settings);

    if (input.method === "delivery" && cfg.deliveryEnabled === false) {
      throw httpError(400, "Delivery is not available right now.");
    }
    if (input.method === "collection" && cfg.collectionEnabled === false) {
      throw httpError(400, "Collection is not available right now.");
    }

    const rows = [];
    for (const line of input.items) {
      const doc = await this.get("products/" + line.productId, tx);
      if (!doc) throw httpError(400, "One of the items in your cart is no longer available.");
      const p = doc.data;
      if (p.active !== true) throw httpError(400, (p.name || "An item") + " is no longer available.");
      if (p.inStock === false) throw httpError(400, (p.name || "An item") + " is sold out.");
      const stock = p.stockQty == null ? null : Number(p.stockQty);
      if (stock != null && line.qty > stock) {
        throw httpError(400, stock <= 0
          ? (p.name || "An item") + " is sold out."
          : "Only " + stock + " of " + (p.name || "that item") + " left.");
      }
      rows.push({ line: line, product: p, doc: doc, unitPrice: effectivePrice(p) });
    }

    const subtotal = round2(rows.reduce(function (sum, r) { return sum + r.unitPrice * r.line.qty; }, 0));
    let fee = input.method === "collection" ? 0 : Number(cfg.deliveryFee || 0);
    const threshold = cfg.freeDeliveryThreshold == null ? null : Number(cfg.freeDeliveryThreshold);
    if (input.method === "delivery" && threshold != null && subtotal >= threshold) fee = 0;
    fee = round2(Math.max(0, fee));

    const lines = rows.map(function (r) { return { unitPrice: r.unitPrice, qty: r.line.qty }; });
    let discountDoc = null;
    let discount = null;
    let discountAmount = 0;
    if (input.code) {
      discountDoc = await this.get("discounts/" + input.code, tx);
      if (!discountDoc) throw httpError(400, "That promo code is not valid.");
      discount = Object.assign({ code: input.code }, discountDoc.data);
      const err = discountError(discount, lines, "online");
      if (err) throw httpError(400, err);
      discountAmount = computeDiscount(discount, lines);
    }

    const total = round2(Math.max(0, subtotal + fee - discountAmount));

    let reference = "KF-" + refCode(5);
    for (let i = 0; i < 5; i++) {
      const taken = await this.get("orderStatus/" + reference, tx);
      if (!taken) break;
      reference = "KF-" + refCode(5);
    }

    const orderId = crypto.randomUUID().replace(/-/g, "");
    const now = Date.now();
    const order = {
      id: orderId,
      reference: reference,
      uid: input.uid,
      customer: { name: input.name, email: input.email, phone: input.phone, note: input.note || undefined },
      delivery: cleanAddress(input.delivery),
      deliveryMethod: input.method,
      deliveryFee: fee,
      subtotal: subtotal,
      discountCode: discountAmount > 0 ? input.code : undefined,
      discountAmount: discountAmount > 0 ? discountAmount : undefined,
      items: rows.map(function (r) {
        return {
          productId: r.line.productId,
          name: r.product.name,
          size: r.product.size || undefined,
          price: r.unitPrice,
          qty: r.line.qty,
        };
      }),
      total: total,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      serverCreatedAt: new Date(),
    };

    const writes = [];
    for (const r of rows) {
      if (r.product.stockQty == null) continue;
      const nextStock = Number(r.product.stockQty) - r.line.qty;
      const fields = { stockQty: toFs(nextStock) };
      if (nextStock <= 0) fields.inStock = toFs(false);
      writes.push({
        update: { name: r.doc.name, fields: fields },
        updateMask: { fieldPaths: Object.keys(fields) },
        currentDocument: { updateTime: r.doc.updateTime },
      });
    }
    writes.push({
      update: { name: this.root + "/orders/" + orderId, fields: mapFields(order) },
      currentDocument: { exists: false },
    });
    writes.push({
      update: {
        name: this.root + "/orderStatus/" + reference,
        fields: mapFields({ reference: reference, status: "pending", total: total, createdAt: now, updatedAt: now }),
      },
      currentDocument: { exists: false },
    });
    if (discountDoc && discountAmount > 0) {
      const used = Number(discount.usedCount || 0) + 1;
      writes.push({
        update: { name: discountDoc.name, fields: { usedCount: toFs(used) } },
        updateMask: { fieldPaths: ["usedCount"] },
        currentDocument: { updateTime: discountDoc.updateTime },
      });
    }

    await this.commit(tx, writes);
    return { order: order, settings: cfg };
  }
}

function refCode(length) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function effectivePrice(p) {
  const sale = p.salePrice;
  return sale != null && Number(sale) > 0 && Number(sale) < Number(p.price) ? Number(sale) : Number(p.price) || 0;
}

function expandLines(lines) {
  const units = [];
  for (const line of lines) for (let i = 0; i < line.qty; i++) units.push(line.unitPrice);
  return units;
}

function totalUnits(lines) {
  return lines.reduce(function (n, line) { return n + line.qty; }, 0);
}

function linesSubtotal(lines) {
  return lines.reduce(function (s, line) { return s + line.unitPrice * line.qty; }, 0);
}

function computeDiscount(d, lines) {
  const subtotal = linesSubtotal(lines);
  const mech = d.mechanic || "order";
  let amt = 0;

  if (mech === "order") {
    amt = d.type === "percent" ? (subtotal * Number(d.value || 0)) / 100 : Number(d.value || 0);
  } else if (mech === "item") {
    for (const price of expandLines(lines)) {
      amt += d.type === "percent" ? (price * Number(d.value || 0)) / 100 : Math.min(Number(d.value || 0), price);
    }
  } else if (mech === "bundle") {
    const n = Math.max(1, Number(d.bundleQty) || 1);
    const units = expandLines(lines).sort(function (a, b) { return b - a; });
    const groups = Math.floor(units.length / n);
    if (groups > 0) {
      const participating = units.slice(0, groups * n);
      const partSum = participating.reduce(function (s, price) { return s + price; }, 0);
      const reward = d.bundleReward || "percent";
      if (reward === "percent") amt = (partSum * Number(d.bundleValue || 0)) / 100;
      else if (reward === "fixed") amt = groups * Number(d.bundleValue || 0);
      else if (reward === "price") amt = Math.max(0, partSum - groups * Number(d.bundleValue || 0));
      else if (reward === "free") {
        const k = Math.max(1, Number(d.bundleFree) || 1);
        for (let g = 0; g < groups; g++) {
          const group = participating.slice(g * n, g * n + n);
          for (let i = 0; i < k && i < group.length; i++) amt += group[group.length - 1 - i];
        }
      }
    }
  }
  return Math.min(round2(amt), subtotal);
}

function discountError(d, lines, channel, now) {
  now = now || Date.now();
  const subtotal = linesSubtotal(lines);
  if (d.active !== true) return "This code is not active.";
  const scope = d.scope || "both";
  if (scope !== "both" && scope !== channel) {
    return channel === "pos" ? "This code can't be used at the till." : "This code isn't valid online.";
  }
  if (d.expiresAt && now > Number(d.expiresAt)) return "This code has expired.";
  if (d.maxUses != null && (Number(d.usedCount) || 0) >= Number(d.maxUses)) return "This code has reached its usage limit.";
  if (d.minSpend && subtotal < Number(d.minSpend)) return "Spend at least R" + d.minSpend + " to use this code.";
  if ((d.mechanic || "order") === "bundle") {
    const n = Math.max(1, Number(d.bundleQty) || 1);
    if (totalUnits(lines) < n) return "Add at least " + n + " items to use this code.";
  } else if (computeDiscount(d, lines) <= 0) {
    return "This code gives no discount on your cart.";
  }
  return null;
}

function cleanAddress(a) {
  function clean(v, max) { return String(v == null ? "" : v).trim().slice(0, max); }
  return {
    line1: clean(a.line1, 120),
    line2: clean(a.line2, 120),
    city: clean(a.city, 80),
    province: clean(a.province, 80),
    postalCode: clean(a.postalCode, 20),
    country: clean(a.country, 60) || "South Africa",
  };
}

function toFs(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === "string") return { stringValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFs) } };
  if (typeof value === "object") return { mapValue: { fields: mapFields(value) } };
  return { nullValue: null };
}

function mapFields(obj) {
  const fields = {};
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) fields[key] = toFs(obj[key]);
  }
  return fields;
}

function fromFs(doc) {
  if (!doc || !doc.fields) return {};
  const out = {};
  for (const key of Object.keys(doc.fields)) out[key] = fromFsValue(doc.fields[key]);
  return out;
}

function fromFsValue(v) {
  if (!v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return Date.parse(v.timestampValue);
  if (v.mapValue) return fromFs({ fields: v.mapValue.fields || {} });
  if (v.arrayValue) return (v.arrayValue.values || []).map(fromFsValue);
  return null;
}

function orderForEmail(order) {
  return {
    reference: order.reference,
    total: order.total,
    items: order.items,
    delivery: addressLine(order.delivery),
  };
}

function bankDetails(settings) {
  return {
    accountName: settings.bankAccountName || "Kauā Fragrances",
    bank: settings.bankName || "",
    accountNumber: settings.bankAccountNumber || "",
    branchCode: settings.bankBranchCode || "",
    accountType: settings.bankAccountType || "",
  };
}

async function sendOrderEmails(env, order, settings) {
  if (!env.RESEND_API_KEY) return;
  const emailOrder = orderForEmail(order);
  await sendEmail(env, {
    from: FROM_ORDERS,
    to: order.customer.email,
    replyTo: ORDERS_INBOX,
    subject: "Order " + order.reference + " received — Kauā Fragrances",
    html: orderHtml(order.customer.name, emailOrder, true, order.customer.email, order.customer.phone, bankDetails(settings || {})),
  });
  await sendEmail(env, {
    from: FROM_ORDERS,
    to: ORDERS_INBOX,
    replyTo: order.customer.email,
    subject: "New order " + order.reference + " — " + money(order.total),
    html: orderHtml(order.customer.name, emailOrder, false, order.customer.email, order.customer.phone),
  });
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
const BTN = (href, label) =>
  `<a href="${href}" style="background:#141210;color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:999px;font-weight:700;font-size:15px;display:inline-block;letter-spacing:0.02em">${label}</a>`;

function shell(inner) {
  return `<div style="margin:0;padding:0;background:#f4f3f0">
    <div style="max-width:600px;margin:0 auto;font-family:'Segoe UI',system-ui,-apple-system,Arial,sans-serif;color:#141210">
      <div style="background:#ffffff;text-align:center;padding:28px 20px;border-bottom:3px solid #141210">
        <img src="${SITE_URL}/logo-mark.png" alt="Kauā Fragrances" width="60" height="60" style="object-fit:contain" />
        <div style="font-weight:800;letter-spacing:5px;font-size:20px;margin-top:8px">KAUĀ&nbsp;FRAGRANCES</div>
        <div style="font-style:italic;color:#7d766c;font-size:13px;margin-top:3px">one spray to last the day</div>
      </div>
      <div style="background:#ffffff;padding:30px 28px">${inner}</div>
      <div style="text-align:center;color:#9a9086;font-size:12px;padding:20px;line-height:1.7">
        <a href="${SITE_URL}" style="color:#7d766c;text-decoration:none;font-weight:600">kauafragrances.co.za</a>
        &nbsp;·&nbsp; hello@kauafragrances.co.za<br/>
        &copy; ${new Date().getFullYear()} Kauā Fragrances · Inspired-by fragrance oils
      </div>
    </div>
  </div>`;
}

function bankingBlock(b, reference, total) {
  if (!b || !b.accountNumber || String(b.accountNumber).startsWith('PASTE')) return '';
  const row = (k, v) => `<tr><td style="padding:6px 0;color:#7d766c;font-size:13px">${k}</td><td style="padding:6px 0;text-align:right;font-weight:600;font-size:13px">${esc(v)}</td></tr>`;
  return `<div style="background:#f7f5f1;border-radius:12px;padding:18px 20px;margin:16px 0">
    <div style="font-weight:800;text-transform:uppercase;letter-spacing:0.05em;font-size:13px;margin-bottom:8px">Pay by EFT — ${money(total)}</div>
    <table style="width:100%;border-collapse:collapse">
      ${row('Account name', b.accountName || 'Kauā Fragrances')}
      ${b.bank ? row('Bank', b.bank) : ''}
      ${row('Account no.', b.accountNumber)}
      ${b.branchCode ? row('Branch code', b.branchCode) : ''}
      ${b.accountType ? row('Account type', b.accountType) : ''}
      ${row('Reference', reference)}
    </table>
  </div>`;
}

function restockHtml(product) {
  return shell(`
    <h1 style="font-size:22px;margin:0 0 10px">It's back 🖤</h1>
    <p style="line-height:1.6;color:#3b352f"><strong>${esc(product)}</strong> is back in stock at Kauā Fragrances.
      These move fast — grab yours before it's gone.</p>
    <p style="margin-top:20px">${BTN(SITE_URL, 'Shop now')}</p>`);
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
    <p style="margin-top:20px">${BTN(SITE_URL, 'Browse fragrances')}</p>`);
}

function orderHtml(name, order, forCustomer, customerEmail, phone, banking) {
  const rows = order.items.map((i) =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #eee;font-size:14px">${i.qty} × ${esc(i.name)}${i.size ? ` <span style="color:#7d766c">(${esc(i.size)})</span>` : ''}</td>
     <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;font-size:14px">${money(i.price * i.qty)}</td></tr>`).join('');
  const itemsTable = `<table style="width:100%;border-collapse:collapse;margin:14px 0">${rows}
    <tr><td style="padding:12px 0;font-weight:800">Total</td><td style="padding:12px 0;text-align:right;font-weight:800">${money(order.total)}</td></tr></table>`;

  if (forCustomer) {
    return shell(`
      <h1 style="font-size:23px;margin:0 0 6px">Thank you, ${esc(name)} 🖤</h1>
      <p style="line-height:1.6;color:#3b352f;margin:0 0 16px">We've received your order. Here's your payment reference:</p>
      <div style="text-align:center;border:2px dashed #141210;border-radius:12px;padding:16px;margin:0 0 16px">
        <div style="font-size:26px;font-weight:800;letter-spacing:3px">${esc(order.reference)}</div>
        <div style="font-size:12px;color:#7d766c;margin-top:4px">Use this reference on your EFT so we can match your payment.</div>
      </div>
      ${itemsTable}
      ${order.delivery ? `<p style="color:#3b352f;font-size:14px;margin:0 0 4px"><strong>Deliver to:</strong> ${esc(order.delivery)}</p>` : ''}
      ${bankingBlock(banking, order.reference, order.total)}
      <p style="line-height:1.6;color:#3b352f">Once we confirm your payment we'll get it mixed, packed and on its way — you'll get an email at each step. Questions? Just reply to this email.</p>`);
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
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key');
    res.headers.set('Vary', 'Origin');
  }
  return res;
}
