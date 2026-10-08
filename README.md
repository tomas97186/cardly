# Cardly

Inventory and sales tracker for trading card resellers (Pokémon, One Piece and more).
It follows a card from purchase to sale and tells you what you actually earned.

Cardly is a PWA built with React and Supabase. It is published on Google Play as a
Trusted Web Activity.

## What it does

- **Purchases**: buy single cards or whole lots. A lot has one total price, and you
  catalogue its cards over time.
- **Listings**: track asking price, platform and listing link for every card on sale.
- **Sales**: sell cards one at a time, or bundle cards from anywhere in the inventory
  into a single sale with one total price. Shipping carrier and tracking are stored with
  the sale.
- **Dashboard and reports**: invested, stock value, revenue and margin over any period,
  with charts.
- **Storage boxes**: each physical box gets a QR code. Scan it with the phone camera to
  see what's inside.
- **Exports**: full CSV export and a printable PDF of the cards on sale.
- **Market check**: quick search for a card on eBay, with a configurable marketplace.
- **Premium plan**: subscriptions through Stripe on the web and Google Play Billing in
  the Android app. Free-tier limits are enforced in the database, not only in the UI.
- Italian and English UI, light and dark themes, multiple currencies.

### No made-up numbers

When a cost isn't known, Cardly says so. It never guesses one.

- A lot's price is never split evenly across its cards.
- Cards with an unknown cost are left out of margin calculations, and the app flags them.
- For a bundle sale, margin is computed only when the cost of every card in it is known.

## Stack

| | |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Recharts, lucide-react |
| Backend | Supabase: Postgres with row-level security, Auth, Storage, Edge Functions (Deno) |
| Payments | Stripe Checkout and Customer Portal, Google Play Billing (Digital Goods API) |
| Other | jsPDF, qrcode / jsQR, service worker for offline caching |

## Architecture notes

- **Every query goes to Postgres.** The client never loads the whole inventory. Each
  section requests only the data it needs: lists are paginated, and filtering, sorting
  and search run in Postgres through an RPC (`search_inventory`) and a view.
- **Server-side security.** Row-level security is enabled on every table. The client
  can't change subscription status: a user's profile row is updated only by Edge
  Functions that validate the Stripe and Google Play webhooks with the service role key.
- **Plan limits as database triggers.** Item and photo limits are enforced in Postgres
  as well as in the UI, so calling the API directly doesn't get around them.
- **Plan history.** A trigger logs every change to a user's subscription plan.

## Project structure

```
src/
  components/
    sections/   dashboard, inventory, listings, sales, reports, settings
    forms/      purchase, sale, bulk sale, listing, export
    details/    item / lot / box detail views
    ui/         small reusable components
  context/      theme, language, currency, entitlements
  hooks/        auth, async loading, Android back button
  lib/          data access, formatting, reports, CSV/PDF export, i18n, billing
supabase/
  *.sql         schema, RLS policies, triggers, RPCs
  functions/    Edge Functions for checkout, webhooks, Play purchase verification
```

## Running locally

Requirements: Node 18+ and a Supabase project.

1. Run the SQL files in `supabase/` from the Supabase SQL editor. Run `schema.sql` first,
   then `pagination.sql`, then the others.
2. Copy `.env.example` to `.env.local` and fill in your Supabase URL and anon key.
3. Install and start:

```bash
npm install
npm run dev
```

`npm run build` writes a static build to `dist/`, which you can deploy to any HTTPS host.

Setting up payments is optional. See [STRIPE_SETUP.md](STRIPE_SETUP.md) and
[GOOGLE_PLAY_BILLING_SETUP.md](GOOGLE_PLAY_BILLING_SETUP.md). The secret keys are set as
Supabase Edge Function secrets and are never stored in this repository.
