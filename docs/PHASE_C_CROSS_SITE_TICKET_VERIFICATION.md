# Phase C — Yumorilnik paid tickets in Matryoshka

Status: code deployed, checkout still gated.

## Current implementation
- Matryoshka's New Year event id: 3b7d5371-926e-408b-a4b7-af69f27b42cf.
- Yumorilnik's linked event id: 3f6fa4d1-aaca-4326-9c01-5774cffca2f5.
- Matryoshka still allows public menu browsing. Starting food payment requires a ticket reference and matching email.
- Matryoshka now rechecks eligibility with Yumorilnik at each NYE food checkout. Yumorilnik requires a confirmed booking and paid live Checkout record.
- Secure authentication is configured as matching, sensitive production Vercel settings.
- Food ticket reference is saved as a peppered hash, not plaintext. A failed remote check revokes any old active local eligibility record. Used records do not automatically reactivate.
- Production pepper was configured after verifying no existing imported ticket rows.

## Pending verification
- Positive validation of a genuine paid ticket, wrong-email rejection and refund revocation.
- Verify event menu availability, real allergen declarations, food ordering price/inventory rules.
- Verify food Stripe test payment then separately enable production payment, keeping Yumorilnik and Matryoshka merchant accounts isolated.
- Public food checkout and ticket purchases remain disabled until signed payment and fulfilment end-to-end checks pass.

## Phase C next increment — 29 October 2026

### Database protection installed and verified
- Inspected actual `public.reserve_food_order` function in correct Matryoshka Supabase project `aplkqpmkjwmnnthsmxvx`.
- Found serious mismatch: reserve function allowed a published event with `ordering_enabled=false`, accepted items without allergen statement or without approved chef, and returned existing order IDs for reused idempotency keys regardless of caller's event/booking/email.
- Applied `supabase/migrations/20261029_phase_c_food_order_guards.sql` using Supabase migration tool. It now enforces `ordering_enabled`, approved `chef_event_applications`, complete allergen statement and ingredients, and scoped idempotency; SECURITY DEFINER search_path pinned empty; function execute remains service_role only.
- Read-only verification yielded all four protections true; service=true, anon=false, authenticated=false; total `food_orders=3` unchanged.
- A controlled negative invocation for the closed New Year event raised expected "Event ordering is closed" and did not create an order (still 3 rows).

### Application and admin checks
- Added admin-only GET `/api/admin/integrations/yumorilnik/health`. It sends a deliberately nonexistent ticket reference over the authenticated private server-to-server link, expects `valid:false`, and returns connection/negative-test status without sharing secrets or guest data.
- Added bilingual **Test connection / Проверить связь** button to the NYE event launch-readiness panel. Must click while logged in as an admin to perform the handshake. This proves negative case only, NOT a genuine paid ticket or checkout.
- Updated NYE readiness check to use private Yumorilnik verifier and ticket hash configuration, not count of manually imported tickets, since real purchases are now validated live at every checkout.
- Public event menu endpoint and checkout quote now require that each offered dish's chef is accepted for the specific event, mirroring the updated database RPC.
- Preview `dpl_FuK7Ru2RZUgvdHTjNdXvhS2Urrcr` READY; production rollout `dpl_9mV2EK4sjpRdwtjDcGXGV1G4jkxz` requested (verify READY separately).

### Current actual event readiness
- `novogodnik26`: event is unpublished; food ordering disabled; ordering_closes_at NULL. One accepted participating chef, two event-listed dishes, **zero event-listed dishes available**. One included approved dish lacks ingredients/allergen review and one is an unapproved draft.
- Actual positive paid-ticket handshake unavailable because Yumorilnik live checkout ledger remains empty.
- Both real food and ticket payment switches remain off; no new payment or customer order created.

### Next decisions/tests
- Organiser completes genuine recipe and allergen disclosures, approves real dishes and sets an ordering deadline. **Do not change content to invented safety facts or auto-publish event.**
- Sign in to Matryoshka admin and click the new Test connection button on the New Year event page; confirm negative test rejection.
- Test one confirmed paid Yumorilnik ticket with correct vs incorrect email, cancellation/refund, and one food order once approved and payment provider ready. Close Phase B first only after real paid ticket/email/QR/refund E2E.
