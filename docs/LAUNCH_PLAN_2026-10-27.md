# Matryoshka launch implementation plan — 27 October 2026

## Verified code baseline
- Next.js 16 / React 19 / TypeScript and @supabase/ssr already installed.
- Public home route loads chefs via `GET /api/chefs`.
- Chef detail route uses `getChefBySlug` and displays menu items with a “coming soon” note.
- Existing data access uses `vendors`, `vendor_translations`, `vendor_cuisines`, `menu_items`, and `menu_item_translations`.
- Current client supports Russian/English and chef searches by area/cuisine. It does **not** prove live order persistence or Stripe checkout.
- Supabase project supplied by owner: `aplkqpmkjwmnnthsmxvx`. Connector currently lacks permission to inspect schema; do not overwrite or re-create tables blindly.

## Approved product direction
- Reuse `darshabloom/matryoshka-nz`; Vercel + separate Supabase + Stripe Checkout + Resend when transactional emails are required.
- Four user contexts: admin, chef, signed-in customer, guest customer.
- Admin creates/publishes/unpublishes events, manages chefs/categories/locations and fulfils/exports orders.
- Chef owns reusable dishes, multiple photos, bilingual title/subtitle/details, options/packaging/pricing/tags; supports bulk association to many events and individual overrides.
- Event expiration must remove its public offerings without deleting reusable dishes or historic orders.
- Customer can browse event/category/tag, choose variants and quantities, submit a real food order, and pay by Stripe.
- Yumorilnik and Matryoshka own independent data; connect by explicit public event references and secure booking validation later.

## Build sequence (scope for first usable MVP)
1. Inspect live Supabase schema and existing RLS policies once access is granted; back up before migrations.
2. Add events and event-to-menu-item association to the **existing** `menu_items` model; do not create duplicate dish/vendor models. Keep ordering cutoff separate from event end/publishing.
3. Implement server-authorised admin/chef CRUD with role-scoped access; admin creates event; chef assigns dishes in bulk.
4. Add event catalogue and product options that reflect sale availability and show bilingual fields.
5. Add basket and server-validated order creation, immutable line-item price snapshots, idempotency, order state and stock checks.
6. Implement Stripe Checkout using server-side price calculation and verified webhook; only webhook/verified payment result can mark order paid.
7. Customer confirmation and chef/admin production reports.
8. Integrate Yumorilnik deep link and cross-promotion cards after standalone ordering works.

## Non-negotiable security rules
- All admin/chef writes require server-side authorisation and appropriate Supabase RLS.
- Never put Supabase service keys or Stripe secret keys in browser environment variables.
- Do not collect or mark payment successful based on a client redirect alone.
- Do not let clients supply authoritative prices or ownership IDs.
- Preserve historic orders on menu edits/event expiry; store Stripe events idempotently.
- Keep development/test payments separate from live customer orders.

## Awaiting confirmation / environment
- Supabase access for connected tool; existing schema, auth providers and RLS.
- Stripe account, restricted/test secret and webhook configuration (no secrets in chat).
- Event-order cutoff and whether paid food orders can be amended/refunded.
- Fulfilment: event table, collection counter or pickup; chef settlement arrangement.
- Whether booking proof from Yumorilnik is required for standalone Matryoshka orders.

## Verification discipline
Owner requested no automated tests, builds or test agents without explicit permission. Development may proceed in small changes; label all untested functionality honestly and run checks only after authorisation.
