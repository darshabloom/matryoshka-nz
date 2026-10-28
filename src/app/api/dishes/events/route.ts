import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase/server";
export async function POST(req:Request){
 const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:"Sign in required"},{status:401});
 const {data:adm}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();const admin=!!adm;
 let body:any;try{body=await req.json()}catch{return NextResponse.json({error:"Invalid request"},{status:400})}
 const ids=Array.isArray(body.ids)?[...new Set(body.ids.filter((s:unknown)=>typeof s==="string"&&/^[0-9a-f-]{36}$/i.test(s)))].slice(0,100):[];
 if(!ids.length||typeof body.event_id!=="string"||!["include","remove"].includes(body.action))return NextResponse.json({error:"Choose an event and dishes"},{status:400});
 const {data:event}=await db.from("events").select("id").eq("id",body.event_id).maybeSingle();
 if(!event)return NextResponse.json({error:"Event not found"},{status:404});
 const {data:dishes}=await db.from("menu_items").select("id,vendor_id,approval_status").in("id",ids);
 if(!dishes||dishes.length!==ids.length)return NextResponse.json({error:"Some dishes are unavailable"},{status:400});
 if(!admin){
  const vendorIds=[...new Set(dishes.map(d=>d.vendor_id))];if(vendorIds.length!==1)return NextResponse.json({error:"Only your dishes can be selected"},{status:403});
  const {data:membership}=await db.from("vendor_users").select("vendor_id").eq("user_id",user.id).eq("vendor_id",vendorIds[0]).maybeSingle();
  const {data:approval}=await db.from("chef_event_applications").select("id").eq("vendor_id",vendorIds[0]).eq("event_id",body.event_id).eq("status","approved").maybeSingle();
  if(!membership||!approval)return NextResponse.json({error:"Chef participation must be approved first"},{status:403});
 }
 if(body.action==="include"){
  const {data:accepted}=await db.from("chef_event_applications").select("vendor_id").eq("event_id",event.id).eq("status","approved");
  const allowed=new Set((accepted??[]).map(a=>a.vendor_id));
  const {error}=await db.from("event_menu_items").upsert(dishes.map(d=>({event_id:event.id,menu_item_id:d.id,is_available:d.approval_status==="approved"&&!!d.vendor_id&&allowed.has(d.vendor_id),price_cents:null})),{onConflict:"event_id,menu_item_id"});
  if(error)return NextResponse.json({error:"Unable to include dishes"},{status:500});
 }else{
  const {error}=await db.from("event_menu_items").delete().eq("event_id",event.id).in("menu_item_id",ids);
  if(error)return NextResponse.json({error:"Unable to remove dishes"},{status:500});
 }
 return NextResponse.json({ok:true,count:ids.length});
}