import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase/server";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function PATCH(req:Request){
 const db=await createSupabaseServerClient(),{data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:"Sign in required"},{status:401});
 const {data:admin}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(!admin)return NextResponse.json({error:"Admin only"},{status:403});
 let b:Record<string,unknown>;try{b=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 if(!uuid.test(String(b.vendor_id??"")))return NextResponse.json({error:"Invalid chef"},{status:400});
 const id=String(b.vendor_id);
 if(b.action==="profile"){
  const name=String(b.name??"").trim(),slug=String(b.slug??"").trim();
  if(!name||name.length>120||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>90)return NextResponse.json({error:"Invalid name or URL"},{status:400});
  const {error}=await db.from("vendors").update({display_name:name,slug,phone:String(b.phone??"").slice(0,60),instagram_handle:String(b.instagram??"").slice(0,120),hero_image_url:String(b.image??"").slice(0,1000),area_code:String(b.area??"").slice(0,100)}).eq("id",id);
  if(error)return NextResponse.json({error:error.message},{status:500});
  for(const lang of ["en","ru"]){
   const {error:tr}=await db.from("vendor_translations").upsert({vendor_id:id,lang,description:String(b[lang+"_description"]??"").slice(0,4000),tagline:String(b[lang+"_tagline"]??"").slice(0,300),about:String(b[lang+"_about"]??"").slice(0,4000)},{onConflict:"vendor_id,lang"});
   if(tr)return NextResponse.json({error:"Profile saved, but translation failed: "+tr.message},{status:500});
  }
  return NextResponse.json({ok:true});
 }
 if(b.action==="assign"){
  if(!uuid.test(String(b.dish_id??"")))return NextResponse.json({error:"Invalid dish"},{status:400});
  const dishId=String(b.dish_id);
  const {data:dish}=await db.from("menu_items").select("id,vendor_id,approval_status").eq("id",dishId).maybeSingle();
  if(!dish)return NextResponse.json({error:"Dish not found"},{status:404});
  if(dish.vendor_id&&dish.vendor_id!==id)return NextResponse.json({error:"Dish belongs to another chef; unassign it there first"},{status:409});
  if(dish.approval_status!=="draft")return NextResponse.json({error:"Only draft dishes can be assigned"},{status:409});
  const {error}=await db.from("menu_items").update({vendor_id:id,is_active:false}).eq("id",dishId);
  return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({ok:true});
 }
 if(b.action==="unassign"){
  if(!uuid.test(String(b.dish_id??"")))return NextResponse.json({error:"Invalid dish"},{status:400});
  const {data:dish}=await db.from("menu_items").select("approval_status").eq("id",String(b.dish_id)).eq("vendor_id",id).maybeSingle();
  if(!dish||dish.approval_status!=="draft")return NextResponse.json({error:"Only draft dishes can be unassigned"},{status:409});
  const {error}=await db.from("menu_items").update({vendor_id:null,is_active:false}).eq("id",String(b.dish_id)).eq("vendor_id",id);
  return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({ok:true});
 }
 return NextResponse.json({error:"Unknown action"},{status:400});
}
