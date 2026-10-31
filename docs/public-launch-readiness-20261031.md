# Matryoshka — Public Launch Readiness
Updated: 31 October 2026. Production: https://matryoshka.nz

This document supersedes stale launch-blocker statements in docs/customer-checkout-setup.md. Status means **verified** only where confirmed by production database or completed live transaction; code deployment alone is **implemented, pending acceptance**.

## Production evidence

- Stripe live merchant account matched successfully after restricted key Accounts Read permission.
- A single restricted live order was charged at NZ$0.55 (MF-0001, DarshaCooks DC-001); paid/confirmed recorded.
- Customer, chef and admin notification queue shows one **sent** delivery each.
- Receipt page and chef dashboard displayed the correct order references.
- New itemised receipt and Resend customer PDF attachment were deployed after MF-0001 and **have not yet been verified through a second paid transaction**.
- 29 approved dishes (including test), 6 dish categories and 5 approved chef-event applications in production when checked.
- New Years 2027 event ordering_enabled=false, and public checkout CHECKOUT_ENABLED remains unset/false during controlled testing.

## Stage 1 — Website design and customer experience
Status: **Implemented, final acceptance pending**.
- Russian-inspired, bilingual customer/chef/admin design; event menu and mobile dish cards.
- Check language switching, image crop/zoom/position persistence across customer views, accessibility and mobile Safari/Android.
- Confirm support/privacy pages, contact links, navigation, errors and terms are current.

## Stage 2 — Chef identity, permissions and accounts
Status: **Implemented, regression testing pending**.
- Google linking plus email/password, admin link/relink/unlink view, chef profiles, role-specific dashboards.
- Test chef Google and password sign-ins, home-screen Safari sign-in, revocation, authorisation boundaries and chef-only data.
- Verify linked chef activity/audit information from admin view, where promised.

## Stage 3 — Catalogue and dish management
Status: **Implemented with outstanding tests**.
- Dish editor with separate English/Russian ingredients; category selector and admin management; event quantity limit within editor.
- Admin Save draft / Publish controls; admin dish editing and event inclusion/removal.
- Verify category creation/editing, image crop/zoom/positioning for old and new dishes, draft/publish state, event limit persistence, admin deletion.
- **Autosave for chef edits is still outstanding**.
- Confirm ingredient and allergy information remains safe and understandable in customer display and purchase validation; outdated separate allergen-statement code checks may remain.

## Stage 4 — Event and chef configuration
Status: **Implemented, acceptance pending**.
- Admin event menu, chef filtering, adding/removing chefs, dish approvals and quotas.
- Test each chef's event-dish filter, removal impact on existing orders and event-specific visibility.
- Verify ordering windows, capacity, ticket requirements and published event details.

## Stage 5 — Customer booking, food basket and ticket validation
Status: **Single-dish live test passed; broader cases pending**.
- Ticket verified against Yumorilnik, event-bound order, allergy declaration, server-side price and stock revalidation.
- Test multi-dish, multiple chefs, dish options and different quantity limits, mismatched/refunded/cancelled ticket, incorrect booking email, duplicate submission and cross-event basket.
- Check any expected Yumorilnik eligibility updates/revocations for cancelled/refunded tickets.
- Test accessible and understandable customer errors.

## Stage 6 — Stripe settlement and order lifecycle
Status: **Live charge passed; refund/failure tests pending**.
- Live NZD checkout and merchant check; signed webhook; paid order MF-0001 / DC-001.
- Verify cancellation/refund, payment failures, expiry, asynchronous events, webhook retries, inventory release, double payment/idempotency, 10-minute cancellation request and reconciliation.
- Confirm admin refund process and manual chef settlement arrangements.

## Stage 7 — Notifications and PDF
Status: **Three email types sent; enhanced PDFs pending acceptance**.
- Resend verified; customer, chef and admin messages sent after MF-0001.
- Receipt now includes unit prices, line totals and total paid.
- Customer email now includes generated PDF on subsequent paid orders. **Not yet live-tested.**
- Check Resend PDF attachment opens correctly, prints and displays international dish names acceptably; server generator currently transliterates Cyrillic.
- Check customer, chef and admin recipient privacy, retries and accidental duplicate sends.
- Confirm admin recipient at nzmatryoshka@gmail.com.

## Stage 8 — Security, production operations and controlled-test clean-up
Status: **Blocking**.
- Production temporary allowlist includes a single signed-in customer and hard-coded test dish; **remove production test exception** and disable TEST_CHECKOUT_ENABLED when finished.
- Remove or archive the DarshaCooks no-food test dish (and test listing from event) after evidence is retained.
- Verify checkout gate and event ordering switch before public opening, plus roles/RLS/service-role boundaries.
- Validate admin/support monitoring of failed emails, refunds and fulfilment issues.
- Confirm recovery processes, backup/reconciliation and support ownership.

## Stage 9 — Go/no-go and public opening
Status: **Not yet authorised**.
1. Close all blocking Stage 5–8 tests.
2. Remove controlled test mechanisms.
3. Carry out full customer and chef/admin acceptance on desktop and mobile.
4. Verify terms/privacy/food safety/merchant operational disclosures and chef availability.
5. Confirm exact live event, menu, capacity and ordering start/end.
6. Enable public CHECKOUT_ENABLED only when approved; enable per-event ordering separately.
7. Monitor initial orders, payment/webhook events, notifications and chef fulfilment.

## Out-of-scope / later phase unless launch promise requires them
- Standalone non-event pickup and delivery.
- Automated Stripe chef payouts (manual settlement currently assumed).
- Chef advanced variants editor if specific launch dishes do not require it.
- Additional profile-photo enhancements.

## Current decision
**No-go for unrestricted public checkout at this snapshot.** Core integration works; acceptance, refund and PDF attachment verification, safety and test-cleanup are still required.
