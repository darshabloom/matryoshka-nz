# Matryoshka food ordering: event-menu readiness handover (29 October 2026)

Scope: Matryoshka repository and Matryoshka Supabase only. No Yumorilnik source, database, ticket, Stripe or email changes.

## Read-only database findings
- Matryoshka project: `aplkqpmkjwmnnthsmxvx`.
- Event `novogodnik26` is unpublished and ordering is disabled.
- One accepted chef and one attached dish.
- The dish is approved and active, but has empty ingredients and allergen information, no recorded allergen safety confirmation, and `is_available=false`.
- No customer orders were created or changed.

## Changes on this branch
- Shared food readiness checks require assigned participating chef, approved active dish, completed ingredients and allergen statement, and safety confirmation.
- Event menu admin shows each specific missing prerequisite.
- Admin can enable a ready dish for an event or pause it again; unavailable dishes cannot be enabled by bypassing the UI because the API rechecks safety.
- New dish inclusions are only made available if all conditions already pass.
- Existing paused rows are preserved if an inclusion is retried or a dish is approved.
- Public event menu and checkout quote both require an allergen statement.
- Event readiness permits deliberately paused dishes to remain attached, provided at least one safe active dish is available.

## Launch blockers and verification
1. Real dish information must be entered by the chef or organiser from trustworthy ingredient details; never invent allergen claims.
2. Review pending order reconciliation and Stripe test-mode payment handling.
3. Ticket verification remains separately gated and must be verified before ticket-only ordering goes public.
4. The deployed database function `public.reserve_food_order` currently checks publication, dates, ticket validity, ingredients and allergen confirmation, but does not explicitly enforce `ordering_enabled`, allergen-statement presence or chef participation. Its database-side safeguards should be tightened before launch. The server quote currently checks ordering and allergen statement, but a server/database consistency check is still required.
5. Manually inspect admin and customer flows on a protected preview: an unsafe dish cannot be enabled, a ready one can be enabled/paused, paused dishes disappear from the public menu, and orders cannot start while event ordering is closed.
6. Do not enable event publishing, ordering, live Stripe payments or send customer emails merely because this branch is ready.

No automated test suite, lint, build, CI run or production deployment was intentionally requested or invoked in this work.
