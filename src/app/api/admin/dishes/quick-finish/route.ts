import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase/server";
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
 }
 if(x.action==="assign")return response({ok:true,assigned:vendorId});
 if(!vendorId)return response({error:"Choose a chef before completing the dish"},409);
 const {data:fresh}=await db.from("menu_items").select("ingredients_text,allergen_statement,allergen_review_complete").eq("id",item.id).single();
 if(!fresh?.ingredients_text?.trim()||!fresh?.allergen_statement?.trim()||!fresh.allergen_review_complete)
  return response({error:"Save the real ingredient list and allergen statement, then tick the confirmation box before completing."},409);
 const {data:translations,error:transError}=await db.from("menu_item_translations").select("lang,name").eq("menu_item_id",item.id);
 if(transError||!translations?.find(t=>t.lang==="en"&&t.name?.trim())||!translations?.find(t=>t.lang==="ru"&&t.name?.trim()))
  return response({error:"Enter the Russian and English dish names first"},409);
 const eventId=typeof x.eventId==="string"&&UUID.test(x.eventId)?x.eventId:null;
 if(eventId){
  const {data:accepted,error:acceptedError}=await db.from("chef_event_applications").select("status").eq("event_id",eventId).eq("vendor_id",vendorId).maybeSingle();
  if(acceptedError||accepted?.status!=="approved")return response({error:"Add the chef to this event first (Event → Chefs), then finish the dish."},409);
 }
 const {error:approve}=await db.from("menu_items").update({approval_status:"approved",is_active:true,approved_at:new Date().toISOString(),approved_by:user.id,review_note:null,updated_at:new Date().toISOString()}).eq("id",item.id);
 if(approve)return response({error:"Could not approve dish"},500);
 if(eventId){
  const {error:add}=await db.from("event_menu_items").upsert({event_id:eventId,menu_item_id:item.id,is_available:true},{onConflict:"event_id,menu_item_id"});
  if(add)return response({error:"Dish approved, but could not add to event"},503);
 }
 return response({ok:true,approved:true,eventId});
}
