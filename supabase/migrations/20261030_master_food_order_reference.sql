-- Master food order number, separate from the Yumorilnik admission reference.
-- MF-0001 is shared by every chef on a paid order; chef refs remain per vendor.
BEGIN;
CREATE TABLE IF NOT EXISTS public.food_order_master_counters (
 event_id uuid PRIMARY KEY REFERENCES public.events(id),
 last_number bigint NOT NULL DEFAULT 0 CHECK(last_number>=0)
);
ALTER TABLE public.food_order_master_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.food_order_master_counters FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT,UPDATE ON public.food_order_master_counters TO service_role;

ALTER TABLE public.food_orders ADD COLUMN IF NOT EXISTS master_order_reference text;
ALTER TABLE public.food_orders DROP CONSTRAINT IF EXISTS food_orders_master_reference_format;
ALTER TABLE public.food_orders ADD CONSTRAINT food_orders_master_reference_format
 CHECK(master_order_reference IS NULL OR master_order_reference ~ '^MF-[0-9]{4,}$');
CREATE UNIQUE INDEX IF NOT EXISTS food_orders_master_reference_per_event
 ON public.food_orders(event_id,master_order_reference)
 WHERE master_order_reference IS NOT NULL;

CREATE OR REPLACE FUNCTION public.assign_master_food_reference()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE v_number bigint;
BEGIN
 IF NEW.payment_status='paid' AND NEW.master_order_reference IS NULL THEN
  INSERT INTO public.food_order_master_counters(event_id,last_number)
  VALUES(NEW.event_id,1)
  ON CONFLICT(event_id) DO UPDATE
   SET last_number=public.food_order_master_counters.last_number+1
  RETURNING last_number INTO v_number;
  NEW.master_order_reference:='MF-' || lpad(v_number::text,4,'0');
 END IF;
 RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.assign_master_food_reference() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS assign_master_food_reference_on_paid ON public.food_orders;
CREATE TRIGGER assign_master_food_reference_on_paid
 BEFORE UPDATE OF payment_status ON public.food_orders
 FOR EACH ROW WHEN(NEW.payment_status='paid' AND NEW.master_order_reference IS NULL)
 EXECUTE FUNCTION public.assign_master_food_reference();

-- Backfill existing paid food orders if any. This does not start any payment
-- or change payment state; it only invokes the reference assignment trigger.
UPDATE public.food_orders
SET payment_status=payment_status
WHERE payment_status='paid' AND master_order_reference IS NULL;
COMMIT;
