import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import EventsBoard from "./EventsBoard";
export const dynamic="force-dynamic";
export default async function Page(){
 const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/sign-in");
 const {data:membership}=await db.from("vendor_users").select("vendor_id").eq("user_id",user.id).limit(1);if(!membership?.length)redirect("/chef-onboarding");
 const vendorId=membership[0].vendor_id;
 const [events,apps]=await Promise.all([db.from("events").select("id,title_en,title_ru,starts_at,ends_at,location_text,chef_applications_open,chef_application_deadline,chef_fulfilment_options").gt("ends_at",new Date().toISOString()).order("starts_at"),db.from("chef_event_applications").select("id,event_id,status,review_note").eq("vendor_id",vendorId)]);
 return <main style={{background:"#faf6ef",minHeight:"90vh",padding:"45px 18px"}}><div style={{maxWidth:1050,margin:"auto"}}><Link href="/chef-dashboard" style={{color:"#a52e29",fontWeight:700,textDecoration:"none"}}>← My Kitchen</Link><h1 style={{font:"bold clamp(37px,5vw,53px) Georgia,serif",color:"#962924",margin:"26px 0 9px"}}>My Events</h1><p style={{color:"#766b60",marginBottom:29}}>Manage participating events and apply to new celebrations.</p><EventsBoard vendorId={vendorId} events={events.data??[]} applications={apps.data??[]}/></div></main>;
