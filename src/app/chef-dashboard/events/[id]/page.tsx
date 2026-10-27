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
 return <main style={{background:"#faf6ef",minHeight:"90vh",padding:"45px 18px"}}><div style={{maxWidth:1080,margin:"auto"}}><Link href="/chef-dashboard/events" style={{color:"#9a3029",textDecoration:"none",fontWeight:750}}>← My Events</Link><span style={{display:"block",letterSpacing:3,fontSize:12,color:"#a32b27",fontWeight:800,marginTop:29}}>MATRYOSHKA · PARTICIPATING EVENT</span><h1 style={{font:"bold clamp(38px,5vw,52px) Georgia,serif",color:"#9c2b26",margin:"12px 0"}}>{ev.title_en}</h1><p style={{color:"#776a60"}}>{new Intl.DateTimeFormat("en-NZ",{dateStyle:"full",timeZone:"Pacific/Auckland"}).format(new Date(ev.starts_at))} · {ev.location_text}</p><div style={{background:"white",border:"1px solid #e6d8cb",padding:26,borderRadius:14,marginTop:31}}><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><div><h2 style={{font:"bold 29px Georgia,serif",margin:0}}>My event dishes</h2><p style={{color:"#7b6b60",fontSize:14,marginTop:8}}>{assigned.length} dishes included in this event</p></div><Link href={`/dishes?event=${id}`} style={{display:"inline-flex",background:"#a32d27",color:"white",padding:"13px 19px",borderRadius:9,fontWeight:750,textDecoration:"none"}}>＋ Add dishes →</Link></div><div style={{display:"grid",gap:10,marginTop:22}}>{assigned.length===0?<p style={{padding:20,background:"#fbf4ed",borderRadius:8,color:"#77685d"}}>No dishes included yet. Choose Add dishes to select from your catalogue.</p>:assigned.map(d=><div key={d.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 0",borderBottom:"1px solid #ecdfd2",gap:12}}><div><strong>{d.menu_item_translations?.[0]?.name||"Dish"}</strong><p style={{fontSize:12,color:"#7a6b62",marginTop:7}}>{d.approval_status==="approved"?"Approved for sale":"Not yet approved"}</p></div><strong>NZ$ {(d.price_cents/100).toFixed(2)}</strong></div>)}</div></div></div></main>;

}
