CREATE OR REPLACE FUNCTION public.get_chef_paid_order_details(p_vendor uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS (
  SELECT 1 FROM public.vendor_users m WHERE m.user_id=auth.uid() AND m.vendor_id=p_vendor
 ) THEN RAISE EXCEPTION 'Not authorised for these chef orders'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'order_id',r.order_id,
  'chef_order_reference',r.chef_ref,
  'dish_name_snapshot',r.dish_name_snapshot,
  'quantity',r.quantity,
  'option_snapshot',r.option_snapshot,
  'order_created_at',r.created_at,
  'order_status',r.status,
  'allergy',r.allergy_declaration='declared',
  'allergy_note',r.allergy_details,
  'special_requests',r.special_requests,
  'dish_note',r.dish_note
 ) ORDER BY r.created_at DESC),'[]'::jsonb) INTO result
 FROM (
  SELECT l.order_id,l.dish_name_snapshot,l.quantity,l.option_snapshot,l.dish_note,
   coalesce(fcr.reference,'') as chef_ref,
   o.created_at,o.status,o.allergy_declaration,o.allergy_details,o.special_requests
  FROM public.food_order_lines l JOIN public.food_orders o ON o.id=l.order_id
  LEFT JOIN public.food_order_chef_refs fcr ON fcr.order_id=l.order_id AND fcr.vendor_id=p_vendor
  WHERE l.vendor_id=p_vendor AND o.payment_status='paid'
   AND o.status IN ('confirmed','locked','fulfilled','cancel_requested')
  ORDER BY o.created_at DESC LIMIT 2000
 ) r;
 RETURN result;
END;$function$
