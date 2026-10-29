import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {serviceClient} from "@/lib/server/checkout-security";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const response=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(req:Request){
 const db=await createSupabaseServerClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return response({error:"Sign in required"},401);
 const {data:admin}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(!admin)return response({error:"Admin only"},403);
 let x:any;try{x=await req.json()}catch{return response({error:"Invalid JSON"},400)}
 if(!UUID.test(x.dishId??"")||!["assign","finish"].includes(x.action))return response({error:"Invalid dish/action"},400);
 const vendorId=x.vendorId===null||x.vendorId===""?null:x.vendorId;
 if(vendorId!==null&&!UUID.test(vendorId))return response({error:"Select a valid chef"},400);
 const {data:item,error:itemError}=await db.from("menu_items").select("id,vendor_id,approval_status,ingredients_text,allergen_statement,allergen_review_complete,is_active").eq("id",x.dishId).maybeSingle();
 if(itemError||!item)return response({error:"Dish not found"},404);
 if(vendorId){
  const {data:chef}=await db.from("vendors").select("id").eq("id",vendorId).maybeSingle();
  if(!chef)return response({error:"Chef not found"},404);
 }
 const changing=item.vendor_id!==vendorId;
 if(changing){
  const {error:up}=await db.from("menu_items").update({
   vendor_id:vendorId,approval_status:"draft",is_active:false,approved_by:null,approved_at:null,
   updated_at:new Date().toISOString()
  }).eq("id",item.id);
  if(up)return response({error:"Could not assign chef"},500);
  // Existing event listings must be explicitly rechecked after reassignment.
  const {error:pause}=await db.from("event_menu_items").update({is_available:false}).eq("menu_item_id",item.id);
  if(pause)return response({error:"Chef reassigned, but event listings need review"},503);
  // Update any legacy pending chef-assignment queue so the previous chef
  // does not receive a stale request after Marina assigned the dish directly.
  const secure=serviceClient();
  if(vendorId){
   const {error:assignmentError}=await secure.from("dish_chef_assignments")
    .upsert({dish_id:item.id,vendor_id:vendorId,status:"accepted",
     assigned_by:user.id,assigned_at:new Date().toISOString(),
     responded_at:new Date().toISOString(),chef_note:"Assigned directly by organiser"},
     {onConflict:"dish_id"});
   if(assignmentError)return response({error:"Chef changed, but pending assignment reconciliation failed"},503);
  }else{
   const {error:cleanupError}=await secure.from("dish_chef_assignments")
    .delete().eq("dish_id",item.id);
   if(cleanupError)return response({error:"Chef removed, but an old assignment needs review"},503);
  }
 }
 if(x.action==="assign")return response({ok:true,assigned:vendorId});

 const eventId=typeof x.eventId==="string"&&UUID.test(x.eventId)?x.eventId:null;
 if(eventId){
  const {data:event,error:eventError}=await db.from("events").select("id").eq("id",eventId).maybeSingle();
  if(eventError||!event)return response({error:"Event not found"},404);
  // A direct organiser assignment also accepts the chef for the event,
  // without making Marina repeat an application review workflow.
  const {data:existing,error:checkError}=vendorId?await db.from("chef_event_applications")
   .select("status").eq("event_id",eventId).eq("vendor_id",vendorId).maybeSingle():{data:null,error:null};
  if(checkError)return response({error:"Unable to check event chef participation"},503);
  if(vendorId&&existing?.status!=="approved"){
   const {error:joinError}=await db.from("chef_event_applications").upsert({
    event_id:eventId,vendor_id:vendorId,status:"approved",
    reviewed_by:user.id,reviewed_at:new Date().toISOString(),
    message:"Added by event organiser",review_note:"Approved directly by organiser",
    fulfilment:"at_event"
   },{onConflict:"event_id,vendor_id"});
   if(joinError)return response({error:"Unable to attach chef to this event"},503);
  }
 }
 const {error:approve}=await db.from("menu_items").update({approval_status:"approved",is_active:true,approved_at:new Date().toISOString(),approved_by:user.id,review_note:null,updated_at:new Date().toISOString()}).eq("id",item.id);
 if(approve)return response({error:"Could not approve dish"},500);
 if(eventId){
  const {error:add}=await db.from("event_menu_items").upsert({event_id:eventId,menu_item_id:item.id,is_available:true},{onConflict:"event_id,menu_item_id"});
  if(add)return response({error:"Dish approved, but could not add to event"},503);
 }
 return response({ok:true,approved:true,eventId});
}
