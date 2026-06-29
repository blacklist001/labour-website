# LABOUR Website

A static prototype for LABOUR, a local marketplace for clients to find verified workers and for workers to register, receive job requests, and get paid.

## Open Locally

Open `index.html` in a browser, or run:

```bash
python -m http.server 4173
```

Then visit `http://127.0.0.1:4173`.

## Deploy With GitHub Pages

After pushing this folder to GitHub, go to the repository settings, open **Pages**, and deploy from the `main` branch root.

## Supabase Connection

The frontend connects to Supabase in `app.js` using the public project URL and anon publishable key.

Run `database/schema.sql` in the Supabase SQL Editor before expecting live services, worker profiles, bookings, and reviews to work.

Services are grouped with `service_category`, covering home repair, automotive, cleaning, moving, farm, garden, technical, domestic, and construction work.

The schema includes indexes for account, worker, booking, payment callback, and review lookups. The frontend also limits dashboard/admin lists so larger account volumes do not overload the page.

Bookings include payment method, payment status, and payment reference fields. Cash and Card can be tracked manually. M-Pesa uses Vercel API functions for Daraja STK Push when the environment variables below are configured.

## M-Pesa Daraja Setup

Add these environment variables in Vercel project settings:

```text
SUPABASE_URL=https://ubuftuivhfxzbzcgrkfq.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
MPESA_ENV=sandbox
MPESA_CONSUMER_KEY=your-daraja-consumer-key
MPESA_CONSUMER_SECRET=your-daraja-consumer-secret
MPESA_SHORTCODE=your-paybill-or-sandbox-shortcode
MPESA_PASSKEY=your-daraja-passkey
MPESA_CALLBACK_URL=https://your-vercel-domain.vercel.app/api/mpesa-callback
```

For production, set `MPESA_ENV=production`, use your real shortcode/passkey, and set the callback URL to the final live domain.

After deployment, open `/api/payment-health` on your Vercel domain to confirm the server payment variables are configured. It only returns true/false checks and never returns secret values.

## Testing

Use `docs/testing-checklist.md` to test the live Vercel app before launch.

Use `docs/launch-checklist.md` before sharing the production site publicly.
