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

## Deploy to Vercel

Import the repo; `vercel.json` sets the build command and output dir
(`dist/kf-shop/browser`). Then add the domain **kauafragrances.co.za** under
Settings → Domains and point DNS as Vercel instructs.

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
