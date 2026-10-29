import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase/server";
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export async function POST(req:Request){
 const db=await createSupabaseServerClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:"Sign in required"},{status:401});
 const {data:admin}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 let body:any;try{body=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 if(!UUID.test(body?.dishId??"")||!Array.isArray(body.sizes)||body.sizes.length<1||body.sizes.length>12)
  return NextResponse.json({error:"Add 1–12 portion sizes and prices"},{status:400});
 const {data:dish}=await db.from("menu_items").select("id,vendor_id,approval_status").eq("id",body.dishId).maybeSingle();
 if(!dish)return NextResponse.json({error:"Dish not found"},{status:404});
 if(!admin){
  const {data:membership}=await db.from("vendor_users").select("vendor_id").eq("user_id",user.id).eq("vendor_id",dish.vendor_id).maybeSingle();
  if(!membership||!["draft","changes_requested"].includes(dish.approval_status))
   return NextResponse.json({error:"Only your draft can be edited"},{status:403});
 }
 const rows:{size:string;priceCents:number}[]=[];
 for(const size of body.sizes){
  if(!size||typeof size.size!=="string")return NextResponse.json({error:"Enter a size such as 300g or 1kg"},{status:400});
  const name=size.size.trim().replace(/\s+/g," ").slice(0,45);
  const price=typeof size.price==="string"?Number(size.price):Number(size.price);
  const priceCents=Math.round(price*100);
  if(!name||!Number.isFinite(price)||!Number.isSafeInteger(priceCents)||priceCents<0||priceCents>10000000)
   return NextResponse.json({error:"Each size needs a valid NZD price"},{status:400});
  rows.push({size:name,priceCents});
 }
 if(new Set(rows.map(r=>r.size.toLowerCase())).size!==rows.length)return NextResponse.json({error:"Size labels must be unique"},{status:400});
 const base=Math.min(...rows.map(r=>r.priceCents));
 const {data:groups,error:groupsError}=await db.from("menu_item_options").select("id,label_en").eq("menu_item_id",dish.id);
 if(groupsError)return NextResponse.json({error:"Unable to inspect sizes"},{status:500});
 const weight=groups?.find(g=>g.label_en==="Weight"||g.label_en==="Size");
 if((groups??[]).some(g=>g.id!==weight?.id))return NextResponse.json({error:"This dish still has older extra-option groups. Please contact the organiser before switching to size-only prices."},{status:409});
 let groupId=weight?.id;
 if(!groupId){
  const {data:created,error}=await db.from("menu_item_options").insert({menu_item_id:dish.id,label_en:"Size",label_ru:"Размер",required:true,min_select:1,max_select:1,sort_order:0}).select("id").single();
  if(error||!created)return NextResponse.json({error:"Unable to create size choices"},{status:500});
  groupId=created.id;
 }
 const {data:existing,error:existingError}=await db.from("menu_item_option_values").select("id,label_en,price_delta_cents").eq("option_id",groupId);
 if(existingError)return NextResponse.json({error:"Unable to read existing sizes"},{status:500});
 const kept=new Set<string>();
 for(let i=0;i<rows.length;i++){
  const v=rows[i];
  const old=existing?.find(x=>x.label_en.toLowerCase()===v.size.toLowerCase());
  const fields={label_en:v.size,label_ru:v.size,price_delta_cents:v.priceCents-base,sort_order:i};
  if(old){
   const {error}=await db.from("menu_item_option_values").update(fields).eq("id",old.id);
   if(error)return NextResponse.json({error:"Could not update size prices"},{status:503});
   kept.add(old.id);
  }else{
   const {data:created,error}=await db.from("menu_item_option_values").insert({option_id:groupId,...fields}).select("id").single();
   if(error||!created)return NextResponse.json({error:"Could not add size"},{status:503});
   kept.add(created.id);
  }
 }
 for(const old of existing??[]){
  if(!kept.has(old.id)){
   const {error}=await db.from("menu_item_option_values").delete().eq("id",old.id);
   if(error)return NextResponse.json({error:"Could not remove old size"},{status:503});
  }
 }
 const {error:groupError}=await db.from("menu_item_options").update({label_en:"Size",label_ru:"Размер",min_select:1,max_select:1,required:true}).eq("id",groupId);
 if(groupError)return NextResponse.json({error:"Size labels need review"},{status:503});
 const {error:priceError}=await db.from("menu_items").update({price_cents:base,updated_at:new Date().toISOString()}).eq("id",dish.id);
 if(priceError)return NextResponse.json({error:"Size prices saved but base price was not updated"},503);
 return NextResponse.json({ok:true,count:rows.length,basePriceCents:base});
}
