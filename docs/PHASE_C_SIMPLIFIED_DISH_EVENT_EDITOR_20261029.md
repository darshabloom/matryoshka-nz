# Phase C — simplified chef and event dish workflow
Date: 29 October 2026
Production deployment READY: dpl_DMUDbC94SNah4szgu3K6sZcXxf16.
Git SHA: da170ae67448b990961f084c715b31b535c45040.

## Delivered
- New and existing dish editors now show both English and Russian name/description fields together. Writing-language switch removed.
- Compact size/price table accepts 300g, 1kg or other portion labels, with full NZD price per size; no Standard serving, generic variants editor, disabled customer cart preview or duplicated Description/Ingredients section.
- Marina can choose or reassign a chef on the dish, with the saved chef photo visible.
- Done saves, checks ingredients and allergens, approves the dish, directly adds the chef to the selected event if necessary, and includes the approved dish in that event. Returns to the event menu.
- Existing event chef arrangements are preserved; obsolete pending assignment requests are reconciled on direct reassignment.
- An admin-only event chef picker adds chefs without an application.
- Event workspace redundant navigation removed; Menu tab simplified; Edit & approve replaces the dead-end requirements button.
- Customer size choices show total price, not increment over base price.
- Draft save stays available; edits pause existing availability until approved again.

## Verification
- Preview dpl_2kP1T2NPEYXJwqp7StYxU5o3EoWy and production dpl_DMUDbC94SNah4szgu3K6sZcXxf16 were READY.
- Database RLS policies examined; admin event application and food-menu management permitted.
- Post-deployment read-only query shows three existing food orders, two New Year event dishes and ordering_enabled false.
- Vercel production CHECKOUT_ENABLED is absent; payments remain off.
- Browser-authenticated end-to-end writes (real photo upload, size save, chef reassign and Done) have NOT yet been tested.
- Genuine ingredients, allergen statement and confirmation remain mandatory before approval. No incomplete/test dishes were published.