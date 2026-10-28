import {createSupabaseServerClient} from "@/lib/supabase/server";
type DB=Awaited<ReturnType<typeof createSupabaseServerClient>>;
export async function eventReadiness(db:DB,eventId:string){
 const [ev,menus,apps,tickets]=await Promise.all([
  db.from("events").select("id,title_en,starts_at,ends_at,location_text,ordering_closes_at,is_published,ordering_enabled,ticket_required,fulfilment_mode").eq("id",eventId).maybeSingle(),
  db.from("event_menu_items").select("menu_item_id,is_available,menu_items(id,vendor_id,approval_status,is_active,ingredients_text,allergen_statement,allergen_review_complete)").eq("event_id",eventId),
  db.from("chef_event_applications").select("vendor_id,status").eq("event_id",eventId),
  db.rpc("count_verified_event_bookings",{p_event_id:eventId})
 ]);
 const event=ev.data;if(!event)throw Error("Event not found");
 const dishes=(menus.data??[]).map((m:any)=>({...m,item:m.menu_items})),participating=(apps.data??[]).filter(a=>a.status==="approved");
 const eligible=(d:any)=>d.is_available===true&&!!d.item?.vendor_id&&d.item?.approval_status==="approved"&&d.item?.is_active===true&&d.item?.allergen_review_complete===true&&!!d.item?.ingredients_text?.trim()&&!!d.item?.allergen_statement?.trim()&&participating.some(p=>p.vendor_id===d.item.vendor_id);
 const offered=dishes.filter(d=>d.is_available===true),unsafe=offered.filter(d=>!eligible(d));
 const title=!!event.title_en?.trim(),dates=!!event.starts_at&&!!event.ends_at&&new Date(event.ends_at)>new Date(event.starts_at)&&new Date(event.ends_at)>new Date(),venue=!!event.location_text?.trim();
 const basics=title&&dates&&venue;
 const chefReady=participating.length>0;
 const menuReady=offered.length>0&&unsafe.length===0;
 const ticketReady=!event.ticket_required||(Number(tickets.data??0)>0&&!!process.env.TICKET_HASH_PEPPER);
 const stripeReady=!!process.env.STRIPE_SECRET_KEY&&!!process.env.STRIPE_WEBHOOK_SECRET&&!!process.env.SUPABASE_SERVICE_ROLE_KEY&&!!process.env.NEXT_PUBLIC_SITE_URL&&process.env.CHECKOUT_ENABLED==="true";
 const deadlineReady=!!event.ordering_closes_at&&new Date(event.ordering_closes_at)>new Date()&&new Date(event.ordering_closes_at)<=new Date(event.starts_at);
 const checks=[
  {key:"details",label:"Event details, venue and dates",ok:basics,help:"Add a valid future event date and venue in Settings"},
  {key:"chefs",label:"Participating chefs",ok:chefReady,help:"Approve at least one chef application in Chefs"},
  {key:"menu",label:"Approved, assigned and safe dishes",ok:menuReady,help:unsafe.length?`${unsafe.length} enabled dishes need chef acceptance, approval or complete food-safety information`:"Enable at least one safe, approved dish in Dishes & Menu"},
  {key:"tickets",label:"Event ticket verification",ok:ticketReady,help:"Import verified Yumorilnik bookings and configure the ticket hash secret"},
  {key:"deadline",label:"Food ordering deadline",ok:deadlineReady,help:"Set an ordering closing time before the event starts"},
  {key:"payments",label:"Stripe payment infrastructure",ok:stripeReady,help:"Complete Stripe test mode, webhook and secure checkout setup in Payments"}
 ];
 return {event,checks,publishReady:basics,orderingReady:basics&&chefReady&&menuReady&&ticketReady&&deadlineReady&&stripeReady,
 counts:{chefs:participating.length,applications:apps.data?.length??0,dishes:dishes.length,readyDishes:offered.length-unsafe.length,unreadyDishes:unsafe.length,pausedDishes:dishes.length-offered.length,bookings:Number(tickets.data??0)}};
}
