# Kauā Fragrances — storefront

Public shop for **Kauā Fragrances** (www.kauafragrances.co.za). Customers browse
fragrances, add to cart, and check out — payment is by **EFT** using an order
reference (no card gateway). Orders and the product catalogue live in the same
Firebase project as the **Oil Tracker** admin app, so managing stock/prices and
seeing orders all happens from there.

- Angular 19 (standalone + signals), SCSS
- Firebase Firestore (`products` read, `orders` create)
- Cart in localStorage; branding: crow mark, Montserrat wordmark, Playfair italic tagline

## Run locally

```bash
npm install
npm start        # http://localhost:4200
```

Products only appear once you've (a) published the Firestore rules and (b) added
products from the Oil Tracker admin app — see setup below.

## Deploy to Cloudflare Pages (free)

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** →
   **Create** → **Pages** → **Connect to Git** → pick `SwasC12/kf-publicsite`.
2. Build settings:
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy` (default)
   - (Node version is pinned to 22 by the `.node-version` file.)
3. **Save and Deploy.** Every push to `main` redeploys automatically.
4. `wrangler.jsonc` serves `dist/kf-shop/browser` and sets
   `not_found_handling: "single-page-application"` so deep links (`/cart`,
   `/checkout`, `/product/:id`) resolve to the app instead of 404ing.
   (Don't use a `_redirects` `/* /index.html 200` rule here — the Workers
   static-assets deploy rejects it as an infinite loop.)

### Custom domain

In the Pages project → **Custom domains** → add **kauafragrances.co.za** (and
`www`). Easiest if the domain's DNS is on Cloudflare (Cloudflare auto-configures
the records); otherwise add the CNAME it shows you at your registrar.

## Transactional email (Resend)

Sign-up and order emails are sent by the Worker (`worker/index.js`) via
[Resend](https://resend.com) — the API key is a Worker **secret**, never in the
browser. Sends a welcome email (from hello@) on sign-up and an order confirmation
(from orders@) on checkout, plus a "new order" heads-up to orders@.

One-time setup (free tier: 3,000 emails/month):

1. Create a free Resend account → **Domains → Add domain** → `kauafragrances.co.za`.
2. Resend shows a few DNS records (DKIM + SPF, usually on a `send` subdomain, and
   a DMARC record). Add them in **Cloudflare → DNS** (leave your Zoho MX/TXT
   alone — Resend uses its own subdomain for sending, so they don't clash). Wait
   for Resend to mark the domain **Verified**.
3. Resend → **API Keys → Create** → copy the key.
4. Cloudflare → **Workers & Pages → kf-publicsite → Settings → Variables and
   Secrets → Add** → name `RESEND_API_KEY`, type **Secret**, paste the key → Save.
   (Or `npx wrangler secret put RESEND_API_KEY`.)
5. Redeploy (a push does this automatically). Until the key is set, the endpoint
   returns 503 and the site simply skips sending — nothing breaks.

### After deploying

Add the live URLs (the `*.pages.dev` one **and** your custom domain) to
**Firebase → Authentication → Settings → Authorized domains** so Firebase works
from the hosted site.

## Fill these in before going live

- **`src/app/banking.config.ts`** — your real EFT/banking details (shown to
  customers on the confirmation page) and contact email/phone.

## Shared Firebase setup (do once, for BOTH apps)

The shop can't read products or take orders until the security rules are live and
you have an admin login. Full steps are in the Oil Tracker repo
(`Perfume/firestore.rules` + its README), summarised here:

1. Firebase console → **Authentication** → enable **Email/Password**; add your
   admin user and copy its **User UID**.
2. Paste that UID into `firestore.rules` (`PASTE_ADMIN_UID`) and publish the rules
   (Firestore Database → Rules).
3. In the Oil Tracker app → **Admin** → sign in → **Products** → add fragrances.
   They appear here instantly.
