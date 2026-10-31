import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {serviceClient} from "@/lib/server/checkout-security";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function DELETE(request:Request){
 const db=await createSupabaseServerClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:"Sign in required"},{status:401});
 const {data:admin}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(!admin)return NextResponse.json({error:"Only administrators may delete dishes"},{status:403});
 let id="";
 try{id=(await request.json()).dishId??""}catch{return NextResponse.json({error:"Invalid request"},{status:400})}
 if(!uuid.test(id))return NextResponse.json({error:"Invalid dish"},{status:400});
 const service=serviceClient();
 const {data:dish,error:dishError}=await service.from("menu_items").select("id").eq("id",id).maybeSingle();
 if(dishError)return NextResponse.json({error:"Unable to check dish"},{status:503});
 if(!dish)return NextResponse.json({error:"Dish not found"},{status:404});
 const {data:ordered,error:ordersError}=await service.from("food_order_lines").select("id").eq("menu_item_id",id).limit(1);
 if(ordersError)return NextResponse.json({error:"Unable to check order history"},{status:503});
 if(ordered?.length){
  const {error:pauseError}=await service.from("menu_items").update({is_active:false,approval_status:"draft"}).eq("id",id);
  if(pauseError)return NextResponse.json({error:"Unable to remove dish from sale"},{status:503});
  const {error:menuError}=await service.from("event_menu_items").delete().eq("menu_item_id",id);
  if(menuError)return NextResponse.json({error:"Dish paused but event links could not be removed"},{status:503});
  return NextResponse.json({ok:true,mode:"archived"});
 }
 const {error}=await service.from("menu_items").delete().eq("id",id);
 if(error)return NextResponse.json({error:"Unable to delete dish: "+error.message},{status:409});
 return NextResponse.json({ok:true,mode:"deleted"});
}
