import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase/server";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(req:Request){
 const db=await createSupabaseServerClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:"Sign in required"},{status:401});
 const {data:admin}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(!admin)return NextResponse.json({error:"Admin access required"},{status:403});
 let data:unknown;try{data=await req.json()}catch{return NextResponse.json({error:"Invalid JSON"},{status:400})}
 if(!data||typeof data!=="object")return NextResponse.json({error:"Invalid payload"},{status:400});
 const {dishId,portions} = data as {dishId?:unknown;portions?:unknown};
 if(typeof dishId!=="string"||!uuid.test(dishId)||!Array.isArray(portions)||portions.length<2||portions.length>12)
  return NextResponse.json({error:"Provide a dish and 2–12 portion sizes"},{status:400});
 const parsed: {grams:number;priceCents:number}[]=[];
 for(const raw of portions){
  if(!raw||typeof raw!=="object")return NextResponse.json({error:"Invalid size"},{status:400});
  const entry=raw as Record<string,unknown>,grams=Number(entry.grams),priceCents=Math.round(Number(entry.price)*100);
  if(!Number.isInteger(grams)||grams<1||grams>100000||!Number.isSafeInteger(priceCents)||priceCents<0||priceCents>10000000)
   return NextResponse.json({error:"Invalid grams or NZD price"},{status:400});
  parsed.push({grams,priceCents});
 }
 parsed.sort((a,b)=>a.grams-b.grams);
 if(new Set(parsed.map(x=>x.grams)).size!==parsed.length)return NextResponse.json({error:"Duplicate weights"},{status:400});
 const base=Math.min(...parsed.map(x=>x.priceCents));
 const {data:dish}=await db.from("menu_items").select("id,approval_status,price_cents").eq("id",dishId).maybeSingle();
 if(!dish||dish.approval_status!=="draft")return NextResponse.json({error:"Only a new draft may be configured"},{status:409});
 if(dish.price_cents!==base)return NextResponse.json({error:"Base dish price must equal the lowest size price"},{status:409});
 const {data:existing,error:checkError}=await db.from("menu_item_options").select("id").eq("menu_item_id",dishId).eq("label_en","Weight").limit(1);
 if(checkError)return NextResponse.json({error:"Unable to inspect sizes"},{status:500});
 if(existing?.length)return NextResponse.json({error:"Weight choices already exist"},{status:409});
 const {data:group,error:groupError}=await db.from("menu_item_options").insert({
  menu_item_id:dishId,label_en:"Weight",label_ru:"Вес",required:true,min_select:1,max_select:1,sort_order:0
 }).select("id").single();
 if(groupError||!group)return NextResponse.json({error:"Unable to create weight selector"},{status:500});
 const rows=parsed.map((p,i)=>({option_id:group.id,label_en:p.grams+" g",label_ru:p.grams+" г",price_delta_cents:p.priceCents-base,sort_order:i}));
 const {error:valueError}=await db.from("menu_item_option_values").insert(rows);
 if(valueError){
  await db.from("menu_item_options").delete().eq("id",group.id);
  return NextResponse.json({error:"Unable to save weight prices. Please retry in the full editor."},{status:500});
 }
 return NextResponse.json({ok:true,choices:rows.length},{status:201});
}
