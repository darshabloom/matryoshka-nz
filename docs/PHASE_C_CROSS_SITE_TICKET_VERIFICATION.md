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
