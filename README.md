# MYTRM — Prototype

Clickable prototype of the MYTRM therapy platform for Gen Z and young professionals.
Same build as the hosted demo: website, sign-up/login, vibe check (intake), therapist
profiles, booking with availability, Razorpay test-mode checkout, confirmations,
client space, therapist portal and admin panel.

## Run it locally

Requires **Node.js 16+** (no `npm install` needed; there are no dependencies).

```bash
cd mytrm-prototype
npm start          # or: node server.js
```

Open **http://localhost:3000**. Change the port in `.env` (`PORT=...`).

No Node? Open `public/index.html` directly in a browser. It still works, using the
defaults in `public/js/env.js`.

> Needs internet only for Google Fonts. Without it the page falls back to system fonts.

## Demo accounts

| Role      | Email            | Password       | Lands on        |
|-----------|------------------|----------------|-----------------|
| Client    | aanya@demo.in    | `demo123`      | My space        |
| Client    | rahul@demo.in    | `demo123`      | My space        |
| Client    | zoya@demo.in     | `demo123`      | My space        |
| Therapist | meera@mytrm.in   | `therapist123` | Therapist portal|
| Admin     | admin@mytrm.in   | `admin123`     | Admin panel     |

The login page also has one-tap buttons for these.

**Test payment:** UPI `success@razorpay`, card `4111 1111 1111 1111`, any future expiry, CVV `123`.
Use the "Simulate result" toggle in checkout to show a failed payment.

## Environment (`.env`)

| Key | Used for |
|-----|----------|
| `PORT`, `HOST` | Local server address |
| `APP_ENV` | Shown in Admin > Settings |
| `PAYMENT_MODE` | Label for the payment mode (`simulated` in this prototype) |
| `RAZORPAY_KEY_ID` | Public key id, shown masked in Admin > Settings |
| `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Server-only placeholders for the real integration. **Never** sent to the browser |
| `GST_RATE` | Tax applied at checkout (default 0.18) |
| `SUPPORT_EMAIL` | Shown in account-disabled messages |

`server.js` exposes only the non-secret keys to the page via `/js/env.js`.

## How data works

There's no database yet. `public/js/app.js` contains a mock API (`api.register`,
`api.login`, `api.createOrder`, `api.capturePayment`, `api.cancelBooking`, ...)
that stores everything in the browser's `localStorage`. So:

- Data is per browser. Bookings made on one laptop won't show on another.
- **Admin > Settings > Reset demo data** restores the sample set.
- Clearing site data in the browser also resets it.

## Project structure

```
mytrm-prototype/
├── server.js            zero-dependency static server + /js/env.js from .env
├── package.json
├── .env / .env.example  configuration
└── public/
    ├── index.html
    ├── css/styles.css   design system + animations
    └── js/
        ├── env.js       fallback config for opening without the server
        └── app.js       SPA: views, mock API, illustrations, mascot, motion
```

## Going to production

1. Replace the mock `api` object with calls to a real backend (e.g. Node/Express + PostgreSQL).
2. Hash passwords with bcrypt/argon2 on the server and use sessions or JWT (the prototype's hash is for demo only).
3. Razorpay: create the order on the server with the Orders API, open Checkout with
   `RAZORPAY_KEY_ID`, verify `razorpay_signature` using `RAZORPAY_KEY_SECRET` (HMAC-SHA256),
   and confirm bookings from the `payment.captured` webhook.
4. Send emails/SMS/WhatsApp for confirmations instead of the in-app inbox.
5. Replace placeholder therapist profiles, stats and testimonials with real, consented content.
