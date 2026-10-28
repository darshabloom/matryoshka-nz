import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import SignOut from "./sign-out";
import styles from "./dashboard.module.css";
export const dynamic="force-dynamic";
export default async function Account({searchParams}:{searchParams:Promise<{tab?:string}>}){
 const {tab="overview"}=await searchParams;
 const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/sign-in");
 const [a,c,orderResult]=await Promise.all([db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle(),db.from("vendor_users").select("vendor_id").eq("user_id",user.id).limit(1),db.from("food_orders").select("id,event_id,status,payment_status,subtotal_cents,created_at,paid_at,events(title_en,title_ru)").eq("user_id",user.id).order("created_at",{ascending:false}).limit(15)]);
 return <main className={styles.page}><div className={styles.inner}>
 <span className={styles.eyebrow}>MATRYOSHKA · YOUR SPACE</span>
 <div className={styles.heading}><div><h1>Welcome to Matryoshka</h1><p>Your customer dashboard · Личный кабинет покупателя</p></div><span className={styles.avatar}>{(user.email??"M")[0].toUpperCase()}</span></div>
 <nav className={styles.accountTabs}><Link href="/account?tab=overview" className={tab==="overview"?styles.currentTab:styles.accountTab}>Overview</Link><Link href="/account?tab=events" className={tab==="events"?styles.currentTab:styles.accountTab}>Events</Link><Link href="/account?tab=orders" className={tab==="orders"?styles.currentTab:styles.accountTab}>Orders</Link></nav>
 {tab==="overview"&&<><div className={styles.sectionHead}><h2>What would you like to do?</h2><p>Choose where you'd like to go next.</p></div>
 <div className={styles.grid}>
 <Link href="/events" className={styles.card}><span className={styles.symbol}>✿</span><h3>Explore events</h3><p>Discover celebrations and browse food prepared by local chefs.</p><strong>Browse events →</strong></Link>
 <Link href="/#menu" className={styles.card}><span className={styles.symbol}>♨</span><h3>Explore homemade food</h3><p>Find traditional favourites, treats and something new.</p><strong>Browse food →</strong></Link>
 {c.data?.length?<Link href="/chef-dashboard" className={styles.card}><span className={styles.symbol}>♧</span><h3>My chef dashboard</h3><p>Manage your event applications and kitchen profile.</p><strong>Open chef dashboard →</strong></Link>:<Link href="/chef-onboarding" className={styles.card}><span className={styles.symbol}>♧</span><h3>Become a chef</h3><p>Share your cooking with the Matryoshka community. Apply to upcoming events.</p><strong>Get started →</strong></Link>}
 {a.data&&<Link href="/admin" className={styles.card}><span className={styles.symbol}>✧</span><h3>Admin dashboard</h3><p>Manage events, applications and the marketplace.</p><strong>Open admin →</strong></Link>}
 </div>
 </>}{tab==="events"&&<section className={styles.orders}><div><h2>Explore events</h2><p>Find celebrations and homemade food from local chefs.</p><Link href="/events" style={{color:"#a32b27",fontWeight:750}}>Browse upcoming events →</Link></div></section>}
 {(tab==="orders"||tab==="overview")&&<section className={styles.orders} style={{display:"block"}}><h2>My orders</h2>{!orderResult.data?.length?<p>No orders are linked to this account yet. If you checked out as a guest, that purchase won't appear here. Sign in before checkout to keep future orders in your account.</p>:<div style={{display:"grid",gap:11,marginTop:18}}>{orderResult.data.map((o:any)=><article key={o.id} style={{display:"flex",justifyContent:"space-between",gap:14,flexWrap:"wrap",padding:"15px 0",borderBottom:"1px solid #eddfd4"}}><div><strong>{o.events?.title_en||"Food order"}</strong><p>Order #{o.id.slice(0,8).toUpperCase()} · {new Intl.DateTimeFormat("en-NZ",{dateStyle:"medium",timeZone:"Pacific/Auckland"}).format(new Date(o.created_at))}</p></div><div><strong>NZ$ {(o.subtotal_cents/100).toFixed(2)}</strong><p>{o.payment_status==="paid"?"Confirmed":"Payment "+o.payment_status}</p></div></article>)}</div>}</section>}
 </div></main>;
}