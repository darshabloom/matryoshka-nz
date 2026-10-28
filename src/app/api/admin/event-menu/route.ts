import {dishReadinessIssues} from "@/lib/menu-readiness";
import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase/server";
const UUID=/^[0-9a-f-]{36}$/i;
export async function PATCH(req:Request){
 const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:"Sign-in required"},{status:401});
 const {data:admin}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();if(!admin)return NextResponse.json({error:"Admin only"},{status:403});
 let input:any;try{input=await req.json()}catch{return NextResponse.json({error:"Invalid request"},{status:400})}
 if(!UUID.test(input.eventId??"")||!UUID.test(input.dishId??""))return NextResponse.json({error:"Invalid event/dish"},{status:400});
 const toggle=typeof input.isAvailable==="boolean";
 if(!toggle&&input.capacity!==null&&(!Number.isInteger(input.capacity)||input.capacity<1||input.capacity>100000))return NextResponse.json({error:"Capacity must be a positive number or unlimited"},{status:400});
 const {data:offer}=await db.from("event_menu_items").select("event_id,menu_item_id").eq("event_id",input.eventId).eq("menu_item_id",input.dishId).maybeSingle();
 if(!offer)return NextResponse.json({error:"Dish is not included in this event"},{status:404});
 if(toggle&&input.isAvailable){
  const {data:dish,error:dishError}=await db.from("menu_items").select("vendor_id,approval_status,is_active,ingredients_text,allergen_statement,allergen_review_complete").eq("id",input.dishId).maybeSingle();
  const {data:chefs,error:chefError}=await db.from("chef_event_applications").select("vendor_id").eq("event_id",input.eventId).eq("status","approved");
  if(dishError||!dish||chefError)return NextResponse.json({error:"Cannot verify menu safety"},{status:503});
  const issues=dishReadinessIssues(dish,(chefs??[]).map(c=>c.vendor_id));
  if(issues.length)return NextResponse.json({error:"Complete dish requirements before enabling",issues},{status:409});
 }
 const {error}=await db.from("event_menu_items").update(toggle?{is_available:input.isAvailable}:{max_quantity:input.capacity}).eq("event_id",input.eventId).eq("menu_item_id",input.dishId);
 if(error)return NextResponse.json({error:"Could not save capacity"},{status:500});
 return NextResponse.json({ok:true,isAvailable:toggle?input.isAvailable:offer.is_available});
}