# Matryoshka menu and profile-photo fixes — 29 October 2026

Production deployment READY: dpl_3PTxkgwbzJCamoPKnq6P7WkFvCaE
Source SHA: 71d8380773b35db14d0a8db48d75890b97a42fed
Branch: feature/event-menu-readiness-controls-20261029

## Verified facts
- Real database had 2 active approved items, 4 draft items. Of the two approved, one had incomplete ingredient/allergen review; the other was explicitly labelled TEST ONLY / NOT FOR SALE.
- Both Matryoshka events remained unpublished with ordering disabled. Do NOT bypass that to make checkout appear.
- Public menu now sources approved actual dishes with images/categories; fixtures are excluded and incomplete items are labelled preparing for sale.
- Event food cards now accept mandatory options, portions, and Add to Basket without opening product detail. Actual payment remains server-gated.
- Authenticated admin account photo now appears in navigation/account; chef account avatar falls back to vendor hero photo; public chef pages, homepage and event dish cards show vendor image.
- Before repair, one uploaded chef image file existed in profile-photos storage, and all vendor hero image URLs were blank. The orphan upload matched Jules Kitchen. Correct Matryoshka Supabase project was updated to link Jules Kitchen to that pre-existing stored photo, with verification `photo_url_saved=true`. No other chef profile was modified.
- After repair, query verified Jules Kitchen had a photo URL, while two other chef profiles still did not. Uploader now checks update affected a real row and cleans up failed uploads.
- Preview build dpl_HZXHPhaqeM8EPqCkJfxhrHYHHQVu READY; production dpl_3PTxkgwbzJCamoPKnq6P7WkFvCaE READY.
- Vercel production CHECKOUT_ENABLED is absent/disabled. No paid food checkout enabled.

## Remaining real-menu release work
- Obtain genuine chef ingredient/allergen declarations, approve and activate dishes, enable safe event menu inclusion, publish event intentionally only when ready.
- Verify actual uploaded photo on live homepage, chef detail, and signed-in avatar from user browser; connector verified URL presence but not a browser visual.
- Verify inline options and basket persistence for an eligible published event. Existing event remains unpublished so no public positive add-to-basket test yet.
- Do not advertise TEST ONLY sample as real menu item.
