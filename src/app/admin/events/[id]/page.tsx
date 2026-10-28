import Link from "next/link";
import {redirect,notFound} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {eventReadiness} from "@/lib/server/eventReadiness";
import EventControls from "./EventControls";
import EventMenuManager from "./EventMenuManager";
import EventSettings from "./EventSettings";
import ReviewBoard from "../../applications/ReviewBoard";
import styles from "../../admin.module.css";
export const dynamic="force-dynamic";
const ID=/^[0-9a-f-]{36}$/i;
export default async function EventWorkspace({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{tab?:string}>}){
 const {id}=await params,{tab="overview"}=await searchParams;if(!ID.test(id))notFound();
 const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/sign-in");
 const {data:admin}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();if(!admin)notFound();
 const [{data:event},{data:vendors},{data:dishes},{data:offers},{data:apps},{data:orders},ready]=await Promise.all([
 db.from("events").select("id,slug,title_en,title_ru,description_en,description_ru,starts_at,ends_at,location_text,external_ticket_url,ordering_opens_at,ordering_closes_at,is_published,ordering_enabled,chef_applications_open,chef_fulfilment_options,ticket_required,fulfilment_mode").eq("id",id).maybeSingle(),
 db.from("vendors").select("id,display_name").order("display_name"),
 db.from("menu_items").select("id,vendor_id,price_cents,approval_status,is_active,allergen_review_complete,menu_item_translations(lang,name)").order("created_at",{ascending:false}),
 db.from("event_menu_items").select("menu_item_id,max_quantity,is_available").eq("event_id",id),
 db.from("chef_event_applications").select("id,vendor_id,status,message,fulfilment,review_note,events(title_en,title_ru),vendors(display_name)").eq("event_id",id),
 db.from("food_orders").select("id,email,created_at,status,payment_status,subtotal_cents").eq("event_id",id).order("created_at",{ascending:false}).limit(100),
 eventReadiness(db,id)
 ]);
 if(!event)notFound();
 const approved=(apps??[]).filter(a=>a.status==="approved"),pending=(apps??[]).filter(a=>a.status==="pending"),paid=(orders??[]).filter(o=>o.payment_status==="paid");
 const t=(event.title_ru||event.title_en),tabs=[["overview","Overview"],["chefs","Chefs"],["menu","Dishes & Menu"],["orders","Orders"],["settings","Settings"]] as const;
 return <main className={styles.dashboardShell}><div className={styles.dashboardInner}>
 <Link href="/admin?tab=events" style={{display:"inline-block",color:"#a32b27",fontWeight:800,textDecoration:"none",marginBottom:17}}>← All events</Link>
 <nav className={styles.dashboardTabs}><Link href="/admin?tab=overview" className={styles.dashboardTab}>Admin Overview</Link><Link href="/admin?tab=events" className={styles.dashboardTabActive}>Events</Link><Link href="/admin?tab=food" className={styles.dashboardTab}>Food</Link><Link href="/admin?tab=chefs" className={styles.dashboardTab}>Chefs</Link><Link href="/admin?tab=orders" className={styles.dashboardTab}>Orders</Link><Link href="/admin?tab=payments" className={styles.dashboardTab}>Settings</Link></nav>
 <div style={{display:"flex",justifyContent:"space-between",gap:18,alignItems:"start",flexWrap:"wrap",margin:"28px 0 22px"}}><div><span className={styles.kicker}>MATRYOSHKA · EVENT WORKSPACE</span><h1 style={{font:"bold clamp(37px,5vw,53px) Georgia,serif",color:"#962e28",margin:"12px 0"}}>{event.title_en}</h1><p style={{color:"#78665e",margin:0}}>{new Intl.DateTimeFormat("en-NZ",{dateStyle:"full",timeZone:"Pacific/Auckland"}).format(new Date(event.starts_at))} · {event.location_text||"Venue not set"}</p><p style={{fontSize:13,color:"#8a604e"}}>{event.is_published?"Published":"Draft"} · Food ordering {event.ordering_enabled?"enabled":"closed"}</p></div><Link href={`/events/${event.slug}`} style={{background:"white",border:"1px solid #b9806b",borderRadius:8,padding:"13px 18px",color:"#a32c27",textDecoration:"none",fontWeight:800}}>Preview customer page ↗</Link></div>
 <nav className={styles.dashboardTabs}>{tabs.map(([key,label])=><Link key={key} href={`/admin/events/${id}?tab=${key}`} className={tab===key?styles.dashboardTabActive:styles.dashboardTab}>{label}</Link>)}</nav>
 {tab==="menu"?<EventMenuManager eventId={id} dishes={(dishes??[]) as any} vendors={vendors??[]} initialOffers={offers??[]} acceptedChefIds={approved.map(a=>a.vendor_id)}/>:
 tab==="chefs"?<section><div style={{display:"flex",justifyContent:"space-between",gap:15,alignItems:"center",flexWrap:"wrap"}}><h2 style={{font:"bold 29px Georgia,serif"}}>Participating chefs ({approved.length})</h2><Link href="/admin?tab=applications" className={styles.panelButton}>All applications →</Link></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(250px,1fr))",gap:15}}>{approved.map(a=><div key={a.id} className={styles.dashboardPanel}><strong style={{font:"bold 22px Georgia,serif"}}>{a.vendors?.display_name||"Kitchen"}</strong><p style={{color:"#287441",fontSize:13}}>✓ Accepted for this event</p><Link href={`/admin/events/${id}?tab=menu`} style={{color:"#a32b27",fontWeight:800}}>View event dishes →</Link></div>)}</div><h2 style={{font:"bold 28px Georgia,serif",margin:"32px 0 0"}}>Applications & decisions ({apps?.length??0})</h2><ReviewBoard initial={(apps??[]) as any}/></section>:
 tab==="orders"?<section className={styles.dashboardPanel}><h2 style={{font:"bold 29px Georgia,serif"}}>Food orders</h2><p>{paid.length} paid orders. Draft or failed payment attempts are not sales.</p>{!orders?.length?<p>No orders yet.</p>:(orders??[]).map(o=><div key={o.id} className={styles.activityRow}><div><strong>#{o.id.slice(0,8).toUpperCase()}</strong><p>{o.email} · {o.status}</p></div><div><strong>NZ$ {(o.subtotal_cents/100).toFixed(2)}</strong><p>{o.payment_status}</p></div></div>)}<Link href="/admin?tab=orders" className={styles.panelButton}>Full order management & refunds →</Link></section>:
 tab==="settings"?<div style={{display:"grid",gap:22}}><EventSettings event={event as any}/><div className={styles.dashboardPanel}><h2 style={{font:"bold 26px Georgia,serif"}}>Ticket verification & payments</h2><p>Verify tickets for this event and configure Stripe separately before opening food ordering.</p><Link className={styles.panelButton} href="/admin?tab=tickets">Manage verified bookings →</Link><Link className={styles.panelButtonSecondary} href="/admin?tab=payments">Stripe settings →</Link></div></div>:
 <><div className={styles.overviewStats}><div><small>Accepted chefs</small><strong>{approved.length}</strong></div><div><small>Pending applications</small><strong>{pending.length}</strong></div><div><small>Dishes included</small><strong>{offers?.length??0}</strong></div><div><small>Ready dishes</small><strong>{ready.counts.readyDishes}</strong></div><div><small>Paid orders</small><strong>{paid.length}</strong></div><div><small>Verified tickets</small><strong>{ready.counts.bookings}</strong></div></div>
 <div className={styles.overviewGrid}><EventControls eventId={id} published={event.is_published} orderingEnabled={event.ordering_enabled} publishReady={ready.publishReady} orderingReady={ready.orderingReady} checks={ready.checks}/>
 <section className={styles.dashboardPanel}><h2>Manage your event</h2><p>{pending.length} chef application(s) awaiting review · {ready.counts.unreadyDishes} included dishes not ready.</p><Link className={styles.panelButton} href={`/admin/events/${id}?tab=chefs`}>Manage participating chefs →</Link><Link className={styles.panelButtonSecondary} href={`/admin/events/${id}?tab=menu`}>Build event menu →</Link><Link className={styles.panelButtonSecondary} href={`/admin/events/${id}?tab=settings`}>Edit event details →</Link><Link className={styles.panelButtonSecondary} href={`/admin/events/${id}?tab=orders`}>View event orders →</Link></section></div></>}
 </div></main>;
}