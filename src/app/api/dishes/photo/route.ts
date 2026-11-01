import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {serviceClient} from "@/lib/server/checkout-security";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request:Request){
 const db=await createSupabaseServerClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:"Sign in required"},{status:401});
 try{
  const form=await request.formData();
  const dishId=String(form.get("dishId")??"");
  const file=form.get("photo");
  if(!uuid.test(dishId)||!(file instanceof File)||file.type!=="image/webp"||file.size>5242880||file.size===0)
   return NextResponse.json({error:"Invalid dish or photo. Please upload a JPG, PNG or WebP image under 5 MB."},{status:400});
  const service=serviceClient();
  const {data:dish}=await service.from("menu_items").select("id,vendor_id").eq("id",dishId).maybeSingle();
  if(!dish)return NextResponse.json({error:"Dish not found"},{status:404});
  const {data:admin}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
  if(!admin){
   const {data:member}=await db.from("vendor_users").select("vendor_id").eq("vendor_id",dish.vendor_id).eq("user_id",user.id).maybeSingle();
   if(!member)return NextResponse.json({error:"You may only upload photos to your own dishes"},{status:403});
  }
  const {count,error:countError}=await service.from("menu_item_images").select("id",{count:"exact",head:true}).eq("menu_item_id",dishId);
  if(countError)return NextResponse.json({error:"Unable to check existing photos"},{status:503});
  if((count??0)>=3)return NextResponse.json({error:"Maximum 3 photos per dish"},{status:409});
  const key=`${dishId}/${crypto.randomUUID()}.webp`;
  const bytes=new Uint8Array(await file.arrayBuffer());
  const {error:uploadError}=await service.storage.from("dish-photos").upload(key,bytes,{contentType:"image/webp",upsert:false});
  if(uploadError)return NextResponse.json({error:"Photo upload failed: "+uploadError.message},{status:503});
  const url=service.storage.from("dish-photos").getPublicUrl(key).data.publicUrl;
  const {data:photo,error:saveError}=await service.from("menu_item_images").insert({menu_item_id:dishId,image_url:url,sort_order:count??0}).select("id,image_url,sort_order,position_x,position_y,zoom_percent,crop_mode").single();
  if(saveError){await service.storage.from("dish-photos").remove([key]);return NextResponse.json({error:"Photo could not be saved: "+saveError.message},{status:503})}
  return NextResponse.json({photo});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to upload photo"},{status:500})}
}
