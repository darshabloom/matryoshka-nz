# Phase C release — event photos, customer notes and 10% markup
Date: 29 October 2026
Production Matryoshka deployment: dpl_3FpBhXHT3Zkok5JffN9t93vBsW54 — READY
Git SHA: d1a972e1c089002fe80a7f875dad68bd51f73a70
Preview: dpl_w6PBe5DehmM8ziLaLHr1L3kQNXH4 — READY

## Delivered
- Customer checkout now accepts optional special requests (500 characters), persists on food_orders.special_requests and displays to organisers and the responsible paid-order chef. The server receives the exact note in the reserved order.
- Allergy declaration no longer blocks payment simply because the customer has an allergy; the customer supplies an allergy note, and organisers and chefs see an ALLERGY / АЛЛЕРГИЯ marker and details. Food safety details are still mandatory on saleable dish metadata; customer note explicitly warns that allergy/cross-contact safety cannot be guaranteed.
- Organiser-only event cover/gallery upload to public event-photos bucket (JPG/PNG/WebP <= 5MB, six gallery pictures). An event has cover_image_url and gallery_image_urls. Customers see the cover on /events, homepage card and event detail, plus gallery images on the detail page.
- Customer event cards now show poster, title, date/time in Pacific/Auckland and location, matching the supplied visual reference. The public event page displays cover, title, description, venue/time, gallery and menu.
- Admin can add/assign any chef and dish to any event without first collecting applications or separately approving; admin addition/Done marks editorial approval and event inclusion, with Show/Hide as event visibility. New dish link is available directly inside the event menu.
- Separately from editorial approval, the quote and database reservation still enforce genuine ingredients, allergens, participating chef, valid Yumorilnik ticket, server pricing and enabled food-ordering before accepting a payment. Visible incomplete dishes cannot be added to the basket.
- Chef-entered base/size prices remain unchanged; customers see 10% markup (for example 1500 chef cents -> 1650 customer cents), rounded per unit, throughout editor, public menu, basket, quote and DB reservation/Stripe Checkout. No duplicate addition on individual pages. Old cached basket key bumped to v2 to prevent displaying stale prices.
- Existing chef profile public page was already using an equivalent 10% markup helper.
- The 8-argument legacy reserve_food_order RPC is no longer callable by service_role; the new 9-argument RPC stores special requests and charges 110% of base+option delta. Authenticated users cannot call it directly.

## Verified
- Supabase Matryoshka project aplkqpmkjwmnnthsmxvx migrations applied: additional event/food order columns, new pricing and comments RPC, event photo bucket, chef-specific paid order detail function.
- DB confirms 1500 cents -> 1650; 2499 -> 2749; new RPC server=true and anon=false; legacy RPC service=false; new chef paid detail function accessible by authenticated only after own-vendor membership check.
- Existing food orders count unchanged at 3. Published New Year event remains published but ordering_enabled=false. No events yet have a cover photo, so organiser must upload one. No real customer payment enabled by this release.
- Vercel preview and production builds READY at the SHA above.

## Still requires authenticated browser verification
- Organiser photo upload and remove (cover + gallery), then visual inspection on events homepage/details.
- Organiser new dish, assign chef, add to event and show/hide, including incomplete dish preview.
- Paid order with allergy and special request, then verify both admin and correct chef views.
- Real end-to-end Stripe payment comparison of quoted markup vs actual paid amount, ticket verification and fulfilment.
- No genuine food payment was processed in this release and CHECKOUT_ENABLED remains unavailable in production.
