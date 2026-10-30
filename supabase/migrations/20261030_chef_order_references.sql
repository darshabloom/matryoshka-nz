-- Chef-specific paid food-order references, counted per chef and event.
-- References are allocated transactionally on first transition to paid.
-- A multi-chef order receives separate references (e.g. JU-001 and BL-001).
BEGIN;

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS order_code_prefix text;

UPDATE public.vendors SET order_code_prefix='JU' WHERE slug='julesnz' AND order_code_prefix IS DISTINCT FROM 'JU';
UPDATE public.vendors SET order_code_prefix='BL' WHERE slug='blackforestkitchen' AND order_code_prefix IS DISTINCT FROM 'BL';
UPDATE public.vendors SET order_code_prefix='DA' WHERE slug='dacha-bowl' AND order_code_prefix IS DISTINCT FROM 'DA';
UPDATE public.vendors SET order_code_prefix='DC' WHERE slug='darshacooks' AND order_code_prefix IS DISTINCT FROM 'DC';

ALTER TABLE public.vendors DROP CONSTRAINT IF EXISTS vendors_order_code_prefix_format;
ALTER TABLE public.vendors ADD CONSTRAINT vendors_order_code_prefix_format
 CHECK(order_code_prefix IS NULL OR order_code_prefix ~ '^[A-Z]{2}$');
CREATE UNIQUE INDEX IF NOT EXISTS vendors_order_code_prefix_unique
 ON public.vendors(order_code_prefix) WHERE order_code_prefix IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.food_order_chef_counters (
 event_id uuid NOT NULL REFERENCES public.events(id),
 vendor_id uuid NOT NULL REFERENCES public.vendors(id),
 last_number bigint NOT NULL DEFAULT 0 CHECK(last_number>=0),
 PRIMARY KEY(event_id,vendor_id)
);
ALTER TABLE public.food_order_chef_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.food_order_chef_counters FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.food_order_chef_counters TO service_role;

CREATE TABLE IF NOT EXISTS public.food_order_chef_refs (
 order_id uuid NOT NULL REFERENCES public.food_orders(id),
 vendor_id uuid NOT NULL REFERENCES public.vendors(id),
 event_id uuid NOT NULL REFERENCES public.events(id),
 order_number bigint NOT NULL CHECK(order_number>0),
 reference text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(order_id,vendor_id),
 UNIQUE(event_id,vendor_id,order_number),
 UNIQUE(event_id,reference)
);
ALTER TABLE public.food_order_chef_refs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.food_order_chef_refs FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.food_order_chef_refs TO service_role;
CREATE INDEX IF NOT EXISTS food_order_chef_refs_vendor_idx ON public.food_order_chef_refs(vendor_id,event_id,order_number);

CREATE OR REPLACE FUNCTION public.ensure_food_order_chef_refs(p_order uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
 v_event uuid;
 v_vendor uuid;
 v_prefix text;
 v_number bigint;
 v_ref text;
BEGIN
 SELECT event_id INTO v_event
 FROM public.food_orders
 WHERE id=p_order AND payment_status='paid';
 IF v_event IS NULL THEN RETURN; END IF;

 FOR v_vendor IN
  SELECT DISTINCT vendor_id FROM public.food_order_lines
  WHERE order_id=p_order ORDER BY vendor_id
 LOOP
  -- Duplicate webhooks never consume another number.
  IF EXISTS(SELECT 1 FROM public.food_order_chef_refs WHERE order_id=p_order AND vendor_id=v_vendor) THEN
   CONTINUE;
  END IF;
  SELECT order_code_prefix INTO v_prefix FROM public.vendors WHERE id=v_vendor;
  IF v_prefix IS NULL OR v_prefix !~ '^[A-Z]{2}$' THEN
   RAISE EXCEPTION 'Chef order prefix is not configured for vendor %',v_vendor;
  END IF;

  INSERT INTO public.food_order_chef_counters(event_id,vendor_id,last_number)
  VALUES(v_event,v_vendor,1)
  ON CONFLICT(event_id,vendor_id) DO UPDATE
   SET last_number=public.food_order_chef_counters.last_number+1
  RETURNING last_number INTO v_number;

  v_ref:=v_prefix||'-'||(CASE WHEN v_number<1000 THEN lpad(v_number::text,3,'0') ELSE v_number::text END);
  INSERT INTO public.food_order_chef_refs(order_id,vendor_id,event_id,order_number,reference)
  VALUES(p_order,v_vendor,v_event,v_number,v_ref)
  ON CONFLICT(order_id,vendor_id) DO NOTHING;
 END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.ensure_food_order_chef_refs(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_food_order_chef_refs(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.assign_food_order_chef_refs_after_payment()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
 PERFORM public.ensure_food_order_chef_refs(NEW.id);
 RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.assign_food_order_chef_refs_after_payment() FROM PUBLIC,anon,authenticated;

DROP TRIGGER IF EXISTS food_order_chef_refs_on_paid ON public.food_orders;
CREATE TRIGGER food_order_chef_refs_on_paid
 AFTER UPDATE OF payment_status ON public.food_orders
 FOR EACH ROW WHEN (NEW.payment_status='paid' AND OLD.payment_status IS DISTINCT FROM 'paid')
 EXECUTE FUNCTION public.assign_food_order_chef_refs_after_payment();

-- Existing successful orders, if any, also receive stable chef references.
DO $function$
DECLARE item record;
BEGIN
 FOR item IN SELECT id FROM public.food_orders WHERE payment_status='paid'
 LOOP
  PERFORM public.ensure_food_order_chef_refs(item.id);
 END LOOP;
END;
$function$;
COMMIT;
