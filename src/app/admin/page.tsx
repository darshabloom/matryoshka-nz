import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import EventManager from "./EventManager";
import DishManager from "../dishes/DishManager";
import ReviewBoard from "./applications/ReviewBoard";
import Link from "next/link";
export const dynamic="force-dynamic";
export default async function AdminPage({searchParams}:{searchParams:Promise<{tab?:string}>}){
 const {tab="events"}=await searchParams;
 const sb=await createSupabaseServerClient();
 const {data:{user}}=await sb.auth.getUser();
 if(!user)redirect("/sign-in");
 const {data:admin,error:permissionError}=await sb.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(permissionError||!admin)redirect("/account");
 const {data:events,error}=await sb.from("events").select("id,slug,title_en,title_ru,description_en,description_ru,starts_at,ends_at,ordering_opens_at,ordering_closes_at,location_text,external_ticket_url,is_published,chef_applications_open,chef_fulfilment_options").order("starts_at",{ascending:false});
 if(tab==="food"){
 const [v,d,a,inc]=await Promise.all([sb.from("vendors").select("id,display_name").order("display_name"),sb.from("menu_items").select("id,vendor_id,price_cents,approval_status,review_note,menu_item_translations(lang,name,description)").order("created_at",{ascending:false}),sb.from("chef_event_applications").select("vendor_id,event_id,status").eq("status","approved"),sb.from("event_menu_items").select("event_id,menu_item_id")]);
 return <main style={{background:"#faf6ef",padding:"30px 18px"}}><nav style={{display:"flex",gap:12,flexWrap:"wrap",maxWidth:1120,margin:"auto"}}><Link href="/admin?tab=events">Events</Link><Link href="/admin?tab=food" style={{fontWeight:800}}>Food & Menus</Link><Link href="/admin?tab=applications">Applications</Link></nav><DishManager isAdmin vendors={v.data??[]} dishes={(d.data??[]) as any} events={(events??[]).map(e=>({id:e.id,title_en:e.title_en,title_ru:e.title_ru,starts_at:e.starts_at}))} inclusions={inc.data??[]} initialError={d.error?.message??""}/></main>;
 }
 if(tab==="applications"){
 const {data:rows}=await sb.from("chef_event_applications").select("id,status,message,fulfilment,review_note,created_at,events(title_en,title_ru),vendors(display_name)").order("created_at",{ascending:false});
 return <main style={{background:"#faf6ef",padding:"45px 18px",minHeight:"85vh"}}><div style={{maxWidth:1100,margin:"auto"}}><nav style={{display:"flex",gap:16,marginBottom:35}}><Link href="/admin?tab=events">Events</Link><Link href="/admin?tab=food">Food & Menus</Link><strong>Applications</strong></nav><h1 style={{font:"bold 43px Georgia,serif",color:"#9c2b26"}}>Chef Applications</h1><ReviewBoard initial={(rows??[]) as any}/></div></main>;
 }
 return <EventManager initialEvents={events??[]} email={user.email??""} initialError={error?"Unable to load events":""}/>;
}