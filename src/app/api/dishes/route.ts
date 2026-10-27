import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase/server";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function access(){const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(!user)return {db,user:null,admin:false};const {data:a}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();return {db,user,admin:!!a}}
export async function POST(req:Request){
 const {db,user,admin}=await access();if(!user)return NextResponse.json({error:"Sign in required"},{status:401});
 let x:any;try{x=await req.json()}catch{return NextResponse.json({error:"Invalid request"},{status:400})}
 if(!UUID.test(x.vendor_id??""))return NextResponse.json({error:"Select a chef"},{status:400});
 if(!admin){const {data:m}=await db.from("vendor_users").select("vendor_id").eq("vendor_id",x.vendor_id).eq("user_id",user.id).maybeSingle();if(!m)return NextResponse.json({error:"Not your kitchen"},{status:403})}
 const name=typeof x.name==="string"?x.name.trim():"";const desc=typeof x.description==="string"?x.description.trim().slice(0,4000):"";
 const lang=x.language==="ru"?"ru":"en";const cents=Math.round(Number(x.price)*100);
 if(!name||name.length>160||!Number.isSafeInteger(cents)||cents<0||cents>10000000)return NextResponse.json({error:"Add a valid dish name and NZD price"},{status:400});
 const {data:item,error}=await db.from("menu_items").insert({vendor_id:x.vendor_id,price_cents:cents,is_active:admin,approval_status:admin?"approved":"draft",approved_by:admin?user.id:null,approved_at:admin?new Date().toISOString():null}).select("id").single();
 if(error)return NextResponse.json({error:"Unable to create dish"},{status:500});
 const {error:tr}=await db.from("menu_item_translations").insert({menu_item_id:item.id,lang,name,description:desc});
 if(tr)return NextResponse.json({error:"Dish created, but its description could not be saved",dish_id:item.id},{status:207});
 return NextResponse.json({id:item.id},{status:201});
}
export async function PATCH(req:Request){
 const {db,user,admin}=await access();if(!user)return NextResponse.json({error:"Sign in required"},{status:401});
 let x:any;try{x=await req.json()}catch{return NextResponse.json({error:"Invalid request"},{status:400})}
 if(!UUID.test(x.id??""))return NextResponse.json({error:"Invalid dish"},{status:400});
 const {data:item}=await db.from("menu_items").select("id,vendor_id,approval_status,price_cents,is_active").eq("id",x.id).maybeSingle();
 if(!item)return NextResponse.json({error:"Dish not found"},{status:404});
 if(!admin){const {data:m}=await db.from("vendor_users").select("vendor_id").eq("vendor_id",item.vendor_id).eq("user_id",user.id).maybeSingle();if(!m)return NextResponse.json({error:"Not your dish"},{status:403})}
 if(x.action==="edit"){
  const name=typeof x.name==="string"?x.name.trim():"";const description=typeof x.description==="string"?x.description.trim().slice(0,4000):"";const lang=x.language==="ru"?"ru":"en";const cents=Math.round(Number(x.price)*100);
  if(!name||name.length>160||!Number.isSafeInteger(cents)||cents<0||cents>10000000)return NextResponse.json({error:"Invalid dish details"},{status:400});
  if(!admin){
   const {error}=await db.rpc("save_chef_dish_draft",{p_id:item.id,p_name:name,p_description:description,p_lang:lang,p_price_cents:cents});
   return error?NextResponse.json({error:"Only your unpublished draft may be edited"},{status:403}):NextResponse.json({ok:true});
  }
  const {error:up}=await db.from("menu_items").update({price_cents:cents,updated_at:new Date().toISOString()}).eq("id",item.id);
  if(up)return NextResponse.json({error:"Unable to update dish price"},{status:500});
  const {error:tr}=await db.from("menu_item_translations").upsert({menu_item_id:item.id,lang,name,description},{onConflict:"menu_item_id,lang"});
  return tr?NextResponse.json({error:"Price updated, but translation could not be saved"},{status:500}):NextResponse.json({ok:true});
 }
 if(x.action==="submit"){
  if(admin)return NextResponse.json({error:"Admin can approve directly"},{status:400});
  if(item.approval_status==="approved")return NextResponse.json({error:"Already approved"},{status:409});
  const {error}=await db.rpc("submit_chef_dish_for_review",{p_dish_id:item.id});return error?NextResponse.json({error:"Unable to submit this dish"},{status:400}):NextResponse.json({ok:true});
 }
 if(x.action==="review"){
  if(!admin)return NextResponse.json({error:"Admin only"},{status:403});
  if(!["approved","changes_requested"].includes(x.status))return NextResponse.json({error:"Invalid review"},{status:400});
  const values=x.status==="approved"?{approval_status:"approved",approved_at:new Date().toISOString(),approved_by:user.id,is_active:true,review_note:null}:{approval_status:"changes_requested",review_note:String(x.note??"").slice(0,2000),is_active:false};
  const {error}=await db.from("menu_items").update(values).eq("id",item.id);return error?NextResponse.json({error:"Review failed"},{status:500}):NextResponse.json({ok:true});
 }
 return NextResponse.json({error:"Unknown action"},{status:400});
}
