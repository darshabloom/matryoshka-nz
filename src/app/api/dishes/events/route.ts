import {dishReadyForEvent} from "@/lib/menu-readiness";
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
 const {data:dishes}=await db.from("menu_items").select("id,vendor_id,approval_status,is_active,ingredients_text,allergen_statement,allergen_review_complete").in("id",ids);
 if(!dishes||dishes.length!==ids.length)return NextResponse.json({error:"Some dishes are unavailable"},{status:400});
 if(!admin){
  const vendorIds=[...new Set(dishes.map(d=>d.vendor_id))];if(vendorIds.length!==1)return NextResponse.json({error:"Only your dishes can be selected"},{status:403});
  const {data:membership}=await db.from("vendor_users").select("vendor_id").eq("user_id",user.id).eq("vendor_id",vendorIds[0]).maybeSingle();
  const {data:approval}=await db.from("chef_event_applications").select("id").eq("vendor_id",vendorIds[0]).eq("event_id",body.event_id).eq("status","approved").maybeSingle();
  if(!membership||!approval)return NextResponse.json({error:"Chef participation must be approved first"},{status:403});
 }
 if(body.action==="include"){
  if(admin){
   // Admin inclusion is a catalogue/editorial action, not a sale-safety waiver.
   // Chef participation is arranged automatically where there is a chef.
   for(const chefId of [...new Set(dishes.map(d=>d.vendor_id).filter(Boolean))]){
    const {data:existing,error:check}=await db.from("chef_event_applications")
     .select("status").eq("event_id",event.id).eq("vendor_id",chefId).maybeSingle();
    if(check)return NextResponse.json({error:"Unable to check participating chef"},{status:503});
    if(existing?.status!=="approved"){
     const {error:accept}=await db.from("chef_event_applications").upsert({
      event_id:event.id,vendor_id:chefId,status:"approved",reviewed_by:user.id,
      reviewed_at:new Date().toISOString(),message:"Included by organiser",
      review_note:"Approved directly by organiser",fulfilment:"at_event"
     },{onConflict:"event_id,vendor_id"});
     if(accept)return NextResponse.json({error:"Unable to include chef"},{status:503});
    }
   }
   const {error:approve}=await db.from("menu_items").update({
    approval_status:"approved",is_active:true,approved_at:new Date().toISOString(),
    approved_by:user.id
   }).in("id",ids);
   if(approve)return NextResponse.json({error:"Unable to approve selected dishes"},{status:503});
  }
  const {data:accepted}=await db.from("chef_event_applications").select("vendor_id").eq("event_id",event.id).eq("status","approved");
  const allowed=(accepted??[]).map(a=>a.vendor_id);
  const {error}=await db.from("event_menu_items").upsert(dishes.map(d=>({
   event_id:event.id,menu_item_id:d.id,
   is_available:admin?true:dishReadyForEvent(d,allowed),price_cents:null
  })),{onConflict:"event_id,menu_item_id"});
  if(error)return NextResponse.json({error:"Unable to include dishes"},{status:500});
 }else{
  const {error}=await db.from("event_menu_items").delete().eq("event_id",event.id).in("menu_item_id",ids);
  if(error)return NextResponse.json({error:"Unable to remove dishes"},{status:500});
 }
 return NextResponse.json({ok:true,count:ids.length});
}