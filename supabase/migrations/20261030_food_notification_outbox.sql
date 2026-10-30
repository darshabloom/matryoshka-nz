BEGIN;
CREATE TABLE IF NOT EXISTS public.food_order_email_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_id uuid NOT NULL REFERENCES public.food_orders(id),
 recipient_kind text NOT NULL CHECK(recipient_kind IN ('customer','chef','admin')),
 vendor_id uuid REFERENCES public.vendors(id),
 recipient_user_id uuid,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed')),
 attempts integer NOT NULL DEFAULT 0,
 last_error text,
 provider_message_id text,
 sent_at timestamptz,
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT food_mail_chef_vendor_match CHECK ((recipient_kind='chef')=(vendor_id IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS food_email_customer_once
 ON public.food_order_email_deliveries(order_id) WHERE recipient_kind='customer';
CREATE UNIQUE INDEX IF NOT EXISTS food_email_chef_once
 ON public.food_order_email_deliveries(order_id,vendor_id,recipient_user_id)
 WHERE recipient_kind='chef';
CREATE UNIQUE INDEX IF NOT EXISTS food_email_admin_once
 ON public.food_order_email_deliveries(order_id,recipient_user_id)
 WHERE recipient_kind='admin';
ALTER TABLE public.food_order_email_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.food_order_email_deliveries FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.food_order_email_deliveries TO service_role;

CREATE OR REPLACE FUNCTION public.queue_paid_food_order_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
BEGIN
 IF NEW.payment_status<>'paid' OR OLD.payment_status IS NOT DISTINCT FROM 'paid' THEN RETURN NEW; END IF;
 INSERT INTO public.food_order_email_deliveries(order_id,recipient_kind)
 VALUES(NEW.id,'customer') ON CONFLICT DO NOTHING;
 INSERT INTO public.food_order_email_deliveries(order_id,recipient_kind,vendor_id,recipient_user_id)
 SELECT NEW.id,'chef',cr.vendor_id,vu.user_id
 FROM public.food_order_chef_refs cr JOIN public.vendor_users vu ON vu.vendor_id=cr.vendor_id
 WHERE cr.order_id=NEW.id
 ON CONFLICT DO NOTHING;
 INSERT INTO public.food_order_email_deliveries(order_id,recipient_kind,recipient_user_id)
 SELECT NEW.id,'admin',a.user_id FROM public.site_admins a
 ON CONFLICT DO NOTHING;
 RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION public.queue_paid_food_order_notifications() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS food_order_queue_notifications_on_paid ON public.food_orders;
CREATE TRIGGER food_order_queue_notifications_on_paid
 AFTER UPDATE OF payment_status ON public.food_orders
 FOR EACH ROW WHEN(NEW.payment_status='paid' AND OLD.payment_status IS DISTINCT FROM 'paid')
 EXECUTE FUNCTION public.queue_paid_food_order_notifications();
COMMIT;