import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import SignOut from "./sign-out";
import styles from "./dashboard.module.css";
export const dynamic="force-dynamic";
export default async function Account(){
 const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/sign-in");
 const [a,c]=await Promise.all([db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle(),db.from("vendor_users").select("vendor_id").eq("user_id",user.id).limit(1)]);
 return <main className={styles.page}><div className={styles.inner}>
 <span className={styles.eyebrow}>MATRYOSHKA · YOUR SPACE</span>
 <div className={styles.heading}><div><h1>Welcome to Matryoshka</h1><p>Your customer dashboard · Личный кабинет покупателя</p></div><span className={styles.avatar}>{(user.email??"M")[0].toUpperCase()}</span></div>
 <div className={styles.profile}><div><span className={styles.small}>SIGNED IN AS / ВЫ ВОШЛИ КАК</span><strong>{user.email}</strong></div><SignOut/></div>
 <div className={styles.sectionHead}><h2>What would you like to do?</h2><p>Choose where you'd like to go next.</p></div>
 <div className={styles.grid}>
 <Link href="/events" className={styles.card}><span className={styles.symbol}>✿</span><h3>Explore events</h3><p>Discover celebrations and browse food prepared by local chefs.</p><strong>Browse events →</strong></Link>
 <Link href="/#menu" className={styles.card}><span className={styles.symbol}>♨</span><h3>Explore homemade food</h3><p>Find traditional favourites, treats and something new.</p><strong>Browse food →</strong></Link>
 {c.data?.length?<Link href="/chef-dashboard" className={styles.card}><span className={styles.symbol}>♧</span><h3>My chef dashboard</h3><p>Manage your event applications and kitchen profile.</p><strong>Open chef dashboard →</strong></Link>:<Link href="/chef-onboarding" className={styles.card}><span className={styles.symbol}>♧</span><h3>Become a chef</h3><p>Share your cooking with the Matryoshka community. Apply to upcoming events.</p><strong>Get started →</strong></Link>}
 {a.data&&<Link href="/admin" className={styles.card}><span className={styles.symbol}>✧</span><h3>Admin dashboard</h3><p>Manage events, applications and the marketplace.</p><strong>Open admin →</strong></Link>}
 </div>
 <section className={styles.orders}><div><h2>My orders</h2><p>Your past orders and updates will appear here once ordering launches.</p></div><span className={styles.coming}>COMING SOON</span></section>
 </div></main>;
}