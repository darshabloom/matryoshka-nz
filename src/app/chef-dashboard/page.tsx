import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import DishManager from "../dishes/DishManager";
import EventsBoard from "./events/EventsBoard";
import styles from "./chef.module.css";
export const dynamic="force-dynamic";
export default async function ChefDashboard({searchParams}:{searchParams:Promise<{tab?:string}>}){
 const {tab="overview"}=await searchParams;
 const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/sign-in");
 const {data:member}=await db.from("vendor_users").select("vendor_id").eq("user_id",user.id).limit(1);
 if(!member?.length)redirect("/chef-onboarding");
 const vendorId=member[0].vendor_id;
 const [{data:dishes},{data:apps}]=await Promise.all([db.from("menu_items").select("id,vendor_id,price_cents,approval_status,review_note,menu_item_translations(lang,name,description)").eq("vendor_id",vendorId).order("created_at",{ascending:false}),db.from("chef_event_applications").select("id,event_id,status,review_note").eq("vendor_id",vendorId)]);
 const n=dishes?.length??0,approved=dishes?.filter(d=>d.approval_status==="approved").length??0,participating=apps?.filter(a=>a.status==="approved").length??0;
 const [vendors,events,includes]=await Promise.all([db.from("vendors").select("id,display_name").eq("id",vendorId),db.from("events").select("id,title_en,title_ru,starts_at,ends_at,location_text,chef_applications_open,chef_application_deadline,chef_fulfilment_options").gt("ends_at",new Date().toISOString()).order("starts_at"),db.from("event_menu_items").select("event_id,menu_item_id")]);
 const eventList=events.data??[],approvedEvents=eventList.filter(e=>apps?.some(a=>a.event_id===e.id&&a.status==="approved"));
 return <main className={styles.page}><div className={styles.wrap}><span className={styles.kicker}>MATRYOSHKA · MY KITCHEN</span><div className={styles.welcome}><div><h1>Welcome to your kitchen</h1><p>Your dishes, events and orders in one place.</p></div><span className={styles.flower}>✿</span></div>
 <nav className={styles.tabs}><Link className={tab==="overview"?styles.activeTab:styles.tab} href="/chef-dashboard?tab=overview">Overview</Link><Link className={tab==="dishes"?styles.activeTab:styles.tab} href="/chef-dashboard?tab=dishes">My Dishes</Link><Link className={tab==="events"?styles.activeTab:styles.tab} href="/chef-dashboard?tab=events">My Events</Link><Link className={tab==="orders"?styles.activeTab:styles.tab} href="/chef-dashboard?tab=orders">Orders</Link></nav>
 {tab==="dishes"?<DishManager isAdmin={false} vendors={vendors.data??[]} dishes={(dishes??[]) as any} events={approvedEvents} inclusions={includes.data??[]} initialError=""/>:
 tab==="events"?<EventsBoard vendorId={vendorId} events={eventList} applications={apps??[]}/>:
 tab==="orders"?<section className={styles.emptyPanel}><h2>My Orders</h2><p>Orders and preparation lists are coming soon.</p></section>:
 <><div className={styles.metrics}><span><strong>{n}</strong> Dishes</span><span><strong>{approved}</strong> Approved</span><span><strong>{participating}</strong> Participating events</span></div><h2>What would you like to do?</h2><div className={styles.cards}><Link href="/chef-dashboard?tab=dishes" className={styles.card}><span className={styles.symbol}>♨</span><h3>My Dishes</h3><p>Create, edit and organise dishes with event tags.</p><strong>Manage my dishes →</strong></Link><Link href="/chef-dashboard?tab=events" className={styles.card}><span className={styles.symbol}>✿</span><h3>My Events</h3><p>See accepted events and apply to new celebrations.</p><strong>View my events →</strong></Link><Link href="/chef-dashboard?tab=orders" className={styles.card}><span className={styles.symbol}>▧</span><h3>My Orders</h3><p>Customer orders and preparation lists.</p><span className={styles.soon}>COMING SOON</span></Link></div></>}
 </div></main>;
}