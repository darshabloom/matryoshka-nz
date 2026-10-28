import EventDishPicker from "./EventDishPicker";
import Link from "next/link";
import {redirect,notFound} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export default async function EventMenu({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/sign-in");
 const {data:member}=await db.from("vendor_users").select("vendor_id").eq("user_id",user.id).limit(1);if(!member?.length)redirect("/chef-onboarding");
 const vendorId=member[0].vendor_id;
 const {data:app}=await db.from("chef_event_applications").select("id").eq("event_id",id).eq("vendor_id",vendorId).eq("status","approved").maybeSingle();if(!app)notFound();
 const [{data:ev},{data:items},{data:included}]=await Promise.all([
 db.from("events").select("title_en,title_ru,starts_at,location_text").eq("id",id).maybeSingle(),
 db.from("menu_items").select("id,price_cents,approval_status,menu_item_translations(name,lang)").eq("vendor_id",vendorId),
 db.from("event_menu_items").select("menu_item_id,max_quantity").eq("event_id",id)
 ]);
 if(!ev)notFound();const assigned=(items??[]).filter(d=>(included??[]).some(i=>i.menu_item_id===d.id));
 return <main style={{background:"#faf6ef",minHeight:"90vh",padding:"45px 18px"}}><div style={{maxWidth:1080,margin:"auto"}}><Link href="/chef-dashboard?tab=events" style={{color:"#9a3029",textDecoration:"none",fontWeight:750}}>← My Events</Link><span style={{display:"block",letterSpacing:3,fontSize:12,color:"#a32b27",fontWeight:800,marginTop:29}}>MATRYOSHKA · PARTICIPATING EVENT</span><h1 style={{font:"bold clamp(38px,5vw,52px) Georgia,serif",color:"#9c2b26",margin:"12px 0"}}>{ev.title_en}</h1><p style={{color:"#776a60"}}>{new Intl.DateTimeFormat("en-NZ",{dateStyle:"full",timeZone:"Pacific/Auckland"}).format(new Date(ev.starts_at))} · {ev.location_text}</p><EventDishPicker eventId={id} initialDishes={(items??[]) as any} initialIncluded={(included??[]).map(x=>x.menu_item_id)}/></div></main>;
}
