-- Phase C: 10% customer markup over chef base price, customer order comments and event photos.
BEGIN;
ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS special_requests text NOT NULL DEFAULT '';
ALTER TABLE public.food_orders DROP CONSTRAINT IF EXISTS food_orders_special_requests_length;
ALTER TABLE public.food_orders ADD CONSTRAINT food_orders_special_requests_length CHECK(length(special_requests)<=500);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS cover_image_url text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS gallery_image_urls jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE OR REPLACE FUNCTION public.reserve_food_order(p_event_id uuid, p_user_id uuid, p_email text, p_booking_id uuid, p_allergy_declaration text, p_allergy_details text, p_items jsonb, p_idempotency_key uuid, p_special_requests text DEFAULT '')
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_order uuid; v_event record; v_item jsonb; v_dish uuid; v_qty integer; v_offer record;
 v_group record; v_selected uuid[]; v_option_count integer; v_checked integer; v_delta integer;
 v_labels jsonb; v_subtotal bigint:=0; v_reserved bigint; v_line_total bigint; v_name text;
begin
 if p_idempotency_key is null then raise exception 'Missing idempotency key'; end if;
 if p_special_requests is null or length(p_special_requests)>500 then raise exception 'Order comments exceed 500 characters';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_event_id::text,0));
 select id into v_order from public.food_orders where checkout_idempotency_key=p_idempotency_key and event_id=p_event_id and booking_id=p_booking_id and email=lower(trim(p_email));
 if v_order is not null then return v_order; end if;
 if exists(select 1 from public.food_orders where checkout_idempotency_key=p_idempotency_key) then raise exception 'Idempotency key belongs to another food order'; end if;
 select * into v_event from public.events where id=p_event_id and is_published and ordering_enabled and ends_at>now() and (ordering_opens_at is null or ordering_opens_at<=now()) and (ordering_closes_at is null or ordering_closes_at>now());
 if not found then raise exception 'Event ordering is closed'; end if;
 if p_email is null or length(p_email)>254 or p_email !~* '^[^ @]+@[^ @]+\.[^ @]+$' then raise exception 'Invalid contact email';end if;
 if p_allergy_declaration not in ('none','declared') or (p_allergy_declaration='declared' and nullif(trim(coalesce(p_allergy_details,'')),'') is null) then raise exception 'Allergy declaration required'; end if;
 if v_event.ticket_required and not exists(select 1 from public.verified_event_bookings where id=p_booking_id and event_id=p_event_id and status='valid' and booking_email=lower(trim(p_email))) then raise exception 'Valid ticket required'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>40 then raise exception 'Invalid basket';end if;
 insert into public.food_orders(event_id,user_id,booking_id,email,allergy_declaration,allergy_details,subtotal_cents,checkout_idempotency_key,special_requests)
 values(p_event_id,p_user_id,p_booking_id,lower(trim(p_email)),p_allergy_declaration,nullif(trim(coalesce(p_allergy_details,'')),''),0,p_idempotency_key,trim(p_special_requests)) returning id into v_order;
 for v_item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(v_item->'optionIds')<>'array' then raise exception 'Invalid options'; end if;
  v_dish:=(v_item->>'dishId')::uuid;
  v_qty:=(v_item->>'quantity')::integer;
  if v_qty not between 1 and 100 then raise exception 'Invalid quantity';end if;
  select m.id,m.vendor_id,m.price_cents,m.ingredients_text,m.allergen_statement,m.allergen_review_complete,m.is_active,m.approval_status,o.max_quantity,v.display_name
  into v_offer from public.event_menu_items o join public.menu_items m on m.id=o.menu_item_id join public.vendors v on v.id=m.vendor_id
  where o.event_id=p_event_id and o.menu_item_id=v_dish and o.is_available
    and exists (select 1 from public.chef_event_applications app where app.event_id=p_event_id and app.vendor_id=m.vendor_id and app.status='approved');
  if not found or not v_offer.is_active or v_offer.approval_status<>'approved' or not v_offer.allergen_review_complete or nullif(trim(v_offer.ingredients_text),'') is null or nullif(trim(v_offer.allergen_statement),'') is null then raise exception 'Dish unavailable or food safety details incomplete';end if;
  if v_offer.max_quantity is not null then
   select coalesce(sum(l.quantity),0) into v_reserved from public.food_order_lines l join public.food_orders ord on ord.id=l.order_id
   where ord.event_id=p_event_id and l.menu_item_id=v_dish and (ord.payment_status='paid' or (ord.status='pending_payment' and ord.created_at>now()-interval '30 minutes'));
   if v_reserved+v_qty>v_offer.max_quantity then raise exception 'Dish quantity limit reached';end if;
  end if;
  select coalesce(array_agg(x.value::uuid),array[]::uuid[]) into v_selected from jsonb_array_elements_text(v_item->'optionIds') x;
  if coalesce(array_length(v_selected,1),0) <> (select count(distinct v) from unnest(v_selected) as v) then raise exception 'Duplicate option choices';end if;
  for v_group in select id,min_select,max_select,required from public.menu_item_options where menu_item_id=v_dish loop
   select count(*) into v_checked from public.menu_item_option_values where option_id=v_group.id and id=any(v_selected);
   if v_checked < greatest(v_group.min_select,case when v_group.required then 1 else 0 end) or v_checked>v_group.max_select then raise exception 'Required options missing or too many selected';end if;
  end loop;
  select count(*),coalesce(sum(val.price_delta_cents),0),coalesce(jsonb_agg(jsonb_build_object('option',g.label_en,'value',val.label_en,'price_delta_cents',val.price_delta_cents)),'[]'::jsonb)
  into v_option_count,v_delta,v_labels from public.menu_item_option_values val join public.menu_item_options g on g.id=val.option_id
  where g.menu_item_id=v_dish and val.id=any(v_selected);
  if v_option_count<>coalesce(array_length(v_selected,1),0) then raise exception 'Invalid option choice';end if;
  select name into v_name from public.menu_item_translations where menu_item_id=v_dish order by case when lang='en' then 0 else 1 end limit 1;
  if nullif(trim(coalesce(v_name,'')),'') is null then raise exception 'Dish title missing';end if;
  -- Chef base price unchanged; +10% per customer unit.
  v_line_total:=(pg_catalog.round((v_offer.price_cents+v_delta)::numeric*1.10))::bigint * v_qty;
  if v_line_total<0 or v_line_total>100000000 then raise exception 'Invalid price';end if;
  insert into public.food_order_lines(order_id,menu_item_id,vendor_id,dish_name_snapshot,option_snapshot,quantity,unit_price_cents,line_total_cents)
  values(v_order,v_dish,v_offer.vendor_id,v_name,v_labels,v_qty,pg_catalog.round((v_offer.price_cents+v_delta)::numeric*1.10)::integer,v_line_total::integer);
  v_subtotal:=v_subtotal+v_line_total;
 end loop;
 if v_subtotal<=0 or v_subtotal>100000000 then raise exception 'Invalid total';end if;
 update public.food_orders set subtotal_cents=v_subtotal::integer where id=v_order;
 return v_order;
end $function$;
REVOKE ALL ON FUNCTION public.reserve_food_order(uuid,uuid,text,uuid,text,text,jsonb,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_food_order(uuid,uuid,text,uuid,text,text,jsonb,uuid,text) TO service_role;
-- Retire the old callable signature to prevent bypass of markup/notes.
REVOKE ALL ON FUNCTION public.reserve_food_order(uuid,uuid,text,uuid,text,text,jsonb,uuid) FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
