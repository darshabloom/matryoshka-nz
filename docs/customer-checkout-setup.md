# Matryoshka Customer Checkout — Configuration & Launch Gates

This branch implements event dish browsing, product selection, multi-chef single-event basket, ticket entry, allergy declaration, Stripe-hosted checkout, signed webhook processing, order history and chef/admin order views.

## Strict activation
Checkout remains **OFF** unless all of these are server-side Vercel environment variables:
- `STRIPE_SECRET_KEY` — start with a Stripe **test-mode** secret.
- `STRIPE_WEBHOOK_SECRET` — signing secret for this deployment's webhook endpoint.
- `SUPABASE_SERVICE_ROLE_KEY` — server-side key, scoped to trusted deployments only. **Never** prefix with NEXT_PUBLIC.
- `TICKET_HASH_PEPPER` — a random, private, stable secret (keep for future validations; rotating it invalidates existing hashes).
- `NEXT_PUBLIC_SITE_URL` — trusted HTTPS site base URL.
- `CHECKOUT_ENABLED=true` — **last**, after verified integration testing.

In Stripe dashboard, register an endpoint at `https://YOUR-TRUSTED-DOMAIN/api/stripe/webhook` and subscribe to:
`checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`, `refund.updated`.

Do not assume installing a Stripe connector in ChatGPT sets any environment variables on Vercel. Do not activate on unrestricted PR previews.

## Ticket verification
- Events default to `ticket_required=true`, `fulfilment_mode=at_event`.
- Admin imports *genuinely validated* event booking reference/email pairs via Dashboard → Tickets.
- References are hashed server-side and never saved in plaintext in the tickets table.
- The matching email and reference are required before Checkout can create an order.
- Booking cancellation/refund at Yumorilnik must invalidate the eligibility record before launch; the current import is not a live sync. Periodic replacement or authenticated integration is needed for long-term operation.
- Opening a Matryoshka page from Yumorilnik alone is not a valid ticket.

## Food allergy policy
- Chef must enter ingredients, allergen statement and confirm food safety information before submitting dish.
- Marina approval additionally checks food safety completion.
- Customer allergy declaration is mandatory. `No known food allergies` may proceed to the usual gated checkout.
- Any **declared allergy** currently blocks payment and directs customers to Marina for a chef safety assessment. A digitally recorded chef approval flow is **not yet implemented**, and safety must not be assumed.

## Order lifecycle
1. Browser displays menu and options. Basket persists locally; one event at a time.
2. POST /api/checkout/quote revalidates option choices, quantities, prices, approved dishes and availability. Browser totals are never trusted.
3. POST /api/checkout/start validates booking and allergy and calls `reserve_food_order` transactionally. Database locks the event and snapshots prices before Stripe.
4. Stripe Checkout is created server-side; webhook signature is checked. Returning to success URL alone is not order confirmation.
5. Customer sees order in account. Chef gets only their own paid preparation lines. Marina sees all orders.
6. Within ten minutes, customer may **request** cancellation; Marina reviews it, issues full refund explicitly, and Stripe outcome is reconciled.
7. Pending reservations count against event capacity for 30 minutes; their cleanup/expiration process should be verified under concurrency.
8. Stripe test card flows and webhook retries must be exercised end-to-end.

## Known launch blockers
- Vercel team has reached its daily deployment quota; the latest branch commit has not yet received a verified deployed build.
- Stripe secrets and production company account aren't configured for this branch.
- Yumorilnik live booking eligibility synchronization and revocation need completion.
- No chef-facing allergy exception clearance workflow yet.
- No finished standalone/non-event pickup/delivery checkout.
- Dish variants are supported in customer choice and server validation when configured, but the chef variant editor remains incomplete.
- Customer profile-photo upload and Stripe automated chef settlement are outside this checkout scope.

No live payments should be accepted until these gates have been reviewed and confirmed.
