import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import EventManager from "./EventManager";
import DishManager from "../dishes/DishManager";
import ReviewBoard from "./applications/ReviewBoard";
import TicketImport from "./TicketImport";
import PaymentsSetup from "./PaymentsSetup";
import OrderManagement from "./OrderManagement";
import styles from "./admin.module.css";
export const dynamic="force-dynamic";
export default async function AdminPage({searchParams}:{searchParams:Promise<{tab?:string}>}){
 const {tab="overview"}=await searchParams;
 const sb=await createSupabaseServerClient();const {data:{user}}=await sb.auth.getUser();if(!user)redirect("/sign-in");
 const {data:admin}=await sb.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();if(!admin)redirect("/account");
 const [eventResult,dishResult,applicationResult,vendorResult,inclusionResult,orderResult]=await Promise.all([
 sb.from("events").select("id,slug,title_en,title_ru,description_en,description_ru,starts_at,ends_at,ordering_opens_at,ordering_closes_at,location_text,external_ticket_url,is_published,chef_applications_open,chef_fulfilment_options").order("starts_at",{ascending:false}),
 sb.from("menu_items").select("id,vendor_id,price_cents,approval_status,review_note,created_at,menu_item_translations(lang,name,description)").order("created_at",{ascending:false}),
 sb.from("chef_event_applications").select("id,vendor_id,event_id,status,message,fulfilment,review_note,created_at,events(title_en,title_ru),vendors(display_name)").order("created_at",{ascending:false}),
 sb.from("vendors").select("id,display_name").order("display_name"),
 sb.from("event_menu_items").select("event_id,menu_item_id"),
 sb.from("food_orders").select("id,status,payment_status,subtotal_cents,created_at,event_id,email,allergy_declaration,allergy_details,special_requests,events(title_en)").order("created_at",{ascending:false}).limit(100)
 ]);
 const events=eventResult.data??[],dishes=dishResult.data??[],apps=applicationResult.data??[],vendors=vendorResult.data??[];
 const heading=tab==="events"?"Events":tab==="food"?"Food & Menus":tab==="applications"?"Chef Applications":tab==="chefs"?"Chefs":tab==="tickets"?"Ticket Verification":tab==="payments"?"Payments & Stripe":tab==="settings"?"Settings":"Admin Dashboard";
 const subtitle=tab==="events"?"Manage events, chef applications and publication settings.":tab==="food"?"Review and manage every chef's dishes.":tab==="applications"?"Review who wants to participate in your events.":tab==="chefs"?"Meet the kitchens behind Matryoshka.":tab==="tickets"?"Import verified booking references for ticket-only event food orders.":tab==="payments"?"Configure Stripe, ticket verification and secure checkout.":tab==="settings"?"Manage ticket eligibility, payment integration and site configuration.":"Your marketplace activity and next actions.";
 const paidOrders=(orderResult.data??[]).filter(o=>o.payment_status==="paid");
 const approvedCount=dishes.filter(d=>d.approval_status==="approved").length,pendingCount=dishes.filter(d=>d.approval_status==="pending").length,pendingApps=apps.filter(a=>a.status==="pending").length;
 const links=[["overview","Overview"],["events","Events"],["food","Food"],["chefs","Chefs"],["orders","Orders"],["settings","Settings"]] as const;
 const active=tab==="applications"?"chefs":["tickets","payments"].includes(tab)?"settings":tab;
 return <main className={styles.dashboardShell}><div className={styles.dashboardInner}><span className={styles.kicker}>MATRYOSHKA · ADMIN</span><div className={styles.dashboardHeading}><h1>{heading}</h1><p>{subtitle}</p></div><nav className={styles.dashboardTabs}>{links.map(([key,label])=><Link key={key} href={`/admin?tab=${key}`} className={key===active?styles.dashboardTabActive:styles.dashboardTab}>{label}</Link>)}</nav>
 {tab==="events"?<EventManager embedded initialEvents={events} email={user.email??""} initialError={eventResult.error?.message??""}/>:
 tab==="food"?<DishManager embedded isAdmin vendors={vendors} dishes={dishes as any} events={events.map(e=>({id:e.id,title_en:e.title_en,title_ru:e.title_ru,starts_at:e.starts_at}))} inclusions={inclusionResult.data??[]} initialError={dishResult.error?.message??""}/>:
 tab==="applications"?<ReviewBoard initial={apps as any}/>:
 tab==="chefs"?<section className={styles.dashboardPanel}><h2>Our Chefs</h2><p>{vendors.length} kitchens registered</p><div className={styles.chefRows}>{vendors.map(v=><div className={styles.chefRow} key={v.id}><span className={styles.chefCircle}>{v.display_name[0]?.toUpperCase()}</span><strong>{v.display_name}</strong><Link href={`/admin/chefs/${v.id}`}>Manage profile →</Link></div>)}</div>{vendors.length===0&&<p>No kitchens yet.</p>}<h2 style={{marginTop:35}}>Chef applications ({apps.length})</h2><ReviewBoard initial={apps as any}/></section>:
 tab==="settings"?<section className={styles.dashboardPanel}><h2>Configuration</h2><p>Keep operational settings separate from event and food management.</p><Link className={styles.panelButton} href="/admin?tab=tickets">Verify event tickets →</Link><Link className={styles.panelButtonSecondary} href="/admin?tab=payments">Stripe & payment setup →</Link></section>:tab==="payments"?<PaymentsSetup/>:tab==="tickets"?<TicketImport events={events.map(e=>({id:e.id,title_en:e.title_en,is_published:e.is_published}))}/>:tab==="orders"?<OrderManagement initial={(orderResult.data??[]) as any}/>:
 <><div className={styles.overviewStats}><div><small>Events</small><strong>{events.length}</strong></div><div><small>Registered chefs</small><strong>{vendors.length}</strong></div><div><small>Approved dishes</small><strong>{approvedCount}</strong></div><div><small>Drafts to finish</small><strong>{dishes.filter(d=>d.approval_status==="draft").length}</strong></div><div><small>Chef applications pending</small><strong>{pendingApps}</strong></div><div><small>Paid orders</small><strong>{paidOrders.length}</strong></div></div>
 <div className={styles.overviewGrid}><section className={styles.dashboardPanel}><h2>Needs your attention</h2>{pendingCount===0&&pendingApps===0?<p>Use the Food or Event pages to add and manage anything directly.</p>:null}<Link href="/admin?tab=applications" className={styles.panelButton}>Manage chefs →</Link><Link href="/admin?tab=food" className={styles.panelButtonSecondary}>Review dishes →</Link></section>
 <section className={styles.dashboardPanel}><h2>Upcoming events</h2>{events.filter(e=>new Date(e.ends_at)>new Date()).slice(0,3).map(e=><Link className={styles.activityRow} key={e.id} href={`/admin/events/${e.id}`}><strong>{e.title_en}</strong><span>{e.is_published?"Published":"Draft"} · {e.chef_applications_open?"Applications open":"Applications closed"}</span></Link>)}{events.length===0&&<p>No events yet.</p>}<Link href="/admin?tab=events" className={styles.panelButton}>Manage events →</Link></section>
 <section className={styles.dashboardPanel}><h2>Recent food listings</h2>{dishes.slice(0,4).map(d=><Link className={styles.activityRow} key={d.id} href={`/dishes/${d.id}`}><strong>{d.menu_item_translations?.[0]?.name||"Untitled dish"}</strong><span>{d.approval_status}</span></Link>)}{dishes.length===0&&<p>No dishes yet.</p>}<Link href="/admin?tab=food" className={styles.panelButton}>Open Food & Menus →</Link></section></div></>}
 </div></main>;
}