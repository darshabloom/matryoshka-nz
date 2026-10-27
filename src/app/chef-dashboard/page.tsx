import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import styles from "./chef.module.css";
export const dynamic="force-dynamic";
export default async function ChefDashboard(){
 const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/sign-in");
 const {data:member}=await db.from("vendor_users").select("vendor_id,vendors(display_name)").eq("user_id",user.id).limit(1);
 if(!member?.length)redirect("/chef-onboarding");
 const vendorId=member[0].vendor_id;
 const [{data:dishes},{data:apps}]=await Promise.all([db.from("menu_items").select("id,approval_status").eq("vendor_id",vendorId),db.from("chef_event_applications").select("id,status").eq("vendor_id",vendorId)]);
 const n=dishes?.length??0,approved=dishes?.filter(d=>d.approval_status==="approved").length??0,participating=apps?.filter(a=>a.status==="approved").length??0;
 return <main className={styles.page}><div className={styles.wrap}><span className={styles.kicker}>MATRYOSHKA · MY KITCHEN</span><div className={styles.welcome}><div><h1>Welcome to your kitchen</h1><p>Create dishes, join celebrations and grow your homemade food business.</p></div><span className={styles.flower}>✿</span></div>
 <div className={styles.metrics}><span><strong>{n}</strong> Dishes</span><span><strong>{approved}</strong> Approved</span><span><strong>{participating}</strong> Participating events</span></div>
 <h2>What would you like to do?</h2><div className={styles.cards}>
 <Link href="/dishes" className={styles.card}><span className={styles.symbol}>♨</span><h3>My Dishes</h3><p>Create, edit and organise your dishes. Choose which events to include them in.</p><strong>Manage my dishes →</strong></Link>
 <Link href="/chef-dashboard/events" className={styles.card}><span className={styles.symbol}>✿</span><h3>My Events</h3><p>See accepted events, track applications and discover events welcoming chefs.</p><strong>View my events →</strong></Link>
 <div className={styles.card}><span className={styles.symbol}>▧</span><h3>My Orders</h3><p>Customer orders and preparation lists will appear here when ordering launches.</p><span className={styles.soon}>COMING SOON</span></div></div></div></main>;
