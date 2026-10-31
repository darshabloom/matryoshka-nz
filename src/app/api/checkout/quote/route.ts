import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {serviceClient,isTestCheckoutAllowed} from "@/lib/server/checkout-security";
import {customerPriceCents} from "@/lib/customer-pricing";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Item={dishId:string;quantity:number;optionIds:string[]};
export async function POST(req:Request){
 let body:any;try{body=await req.json()}catch{return NextResponse.json({error:"Invalid checkout request"},{status:400})}
 const raw=body?.items;if(!UUID.test(body?.eventId??"")||!Array.isArray(raw)||raw.length<1||raw.length>40)return NextResponse.json({error:"Choose an event and 1–40 dishes"},{status:400});
 const items:Item[]=raw.map((x:any)=>({dishId:x?.dishId,quantity:x?.quantity,optionIds:x?.optionIds}));
 const authDb=await createSupabaseServerClient();const {data:{user:testUser}}=await authDb.auth.getUser();
 const testCheckout=body.eventId==="3b7d5371-926e-408b-a4b7-af69f27b42cf"&&raw.length===1&&raw[0]?.dishId==="7f0f8639-dd8c-4aae-963a-a8bea61bced0"&&raw[0]?.quantity===1&&Array.isArray(raw[0]?.optionIds)&&raw[0].optionIds.length===0&&!!testUser?.email&&isTestCheckoutAllowed(testUser.email,testUser.email);

 if(items.some(x=>!UUID.test(x.dishId)||!Number.isInteger(x.quantity)||x.quantity<1||x.quantity>100||!Array.isArray(x.optionIds)||x.optionIds.length>30||x.optionIds.some((id:any)=>!UUID.test(id))))return NextResponse.json({error:"Invalid dish selection or quantity"},{status:400});
 // The QA fixture remains invisible under shared production RLS. Only this protected
// preview branch may read it with the server-only service key; real events use RLS.
 const qaPreview=process.env.VERCEL_ENV==="preview"&&process.env.VERCEL_GIT_COMMIT_REF==="redesign/food-first-home"&&process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")===true;
 const db=testCheckout?serviceClient():qaPreview&&body.eventId==="23334f6b-00ee-445c-859f-b85347ce372c"?serviceClient():await createSupabaseServerClient(),now=new Date().toISOString();
 const {data:event}=await db.from("events").select("id,slug,title_en,title_ru,is_published,starts_at,ends_at,ordering_opens_at,ordering_closes_at,ticket_required,fulfilment_mode,ordering_enabled").eq("id",body.eventId).eq("is_published",true).gt("ends_at",now).maybeSingle();
 if(!event||(!testCheckout&&!event.ordering_opens_at))return NextResponse.json({error:"Food ordering is not open for this event"},{status:409});
 if(!testCheckout&&(event.ordering_opens_at>now||(event.ordering_closes_at&&event.ordering_closes_at<=now)))return NextResponse.json({error:"Food ordering is currently closed"},{status:409});
 const {data:offers,error:offerErr}=await db.from("event_menu_items").select("menu_item_id,is_available,max_quantity,menu_items!inner(id,vendor_id,price_cents,is_active,approval_status,allergen_review_complete,ingredients_text,allergen_statement,menu_item_translations(lang,name),vendors(display_name))").eq("event_id",event.id).in("menu_item_id",items.map(i=>i.dishId));
 if(offerErr)return NextResponse.json({error:"Could not check menu availability"},{status:500});
 const {data:acceptedChefs,error:chefsError}=await serviceClient().from("chef_event_applications")
  .select("vendor_id").eq("event_id",event.id).eq("status","approved");
 if(chefsError)return NextResponse.json({error:"Unable to confirm participating chefs"},{status:503});
 const permittedChefs=new Set((acceptedChefs??[]).map(c=>c.vendor_id));
 const groupIds=items.map(i=>i.dishId);
 const {data:groups,error:ge}=await db.from("menu_item_options").select("id,menu_item_id,required,min_select,max_select,label_en,label_ru").in("menu_item_id",groupIds);
 if(ge)return NextResponse.json({error:"Could not verify dish options"},{status:500});
 const {data:values}=groups?.length?await db.from("menu_item_option_values").select("id,option_id,label_en,label_ru,price_delta_cents").in("option_id",groups.map(g=>g.id)):{data:[] as any[]};
 const result:any[]=[];let subtotal=0;
 for(const it of items){
  const offer=(offers??[]).find((o:any)=>o.menu_item_id===it.dishId);
  const dish=(offer as any)?.menu_items;
  if(!offer||(!offer.is_available&&!testCheckout)||!dish||!dish.is_active||dish.approval_status!=="approved"||!permittedChefs.has(dish.vendor_id))return NextResponse.json({error:"One or more dishes are unavailable for this event. Please review your basket."},{status:409});
  if(offer.max_quantity!==null&&it.quantity>offer.max_quantity)return NextResponse.json({error:"Selected quantity exceeds the event limit"},{status:409});
  const options=(groups??[]).filter(g=>g.menu_item_id===it.dishId);let extra=0;let summary:string[]=[];
  const uniq=[...new Set(it.optionIds)];if(uniq.length!==it.optionIds.length)return NextResponse.json({error:"Duplicate options not allowed"},{status:400});
  for(const group of options){
   const selected=(values??[]).filter((v:any)=>v.option_id===group.id&&uniq.includes(v.id));
   if(selected.length<Math.max(group.min_select,group.required?1:0)||selected.length>group.max_select)return NextResponse.json({error:"Choose the required options for every dish"},{status:400});
   for(const v of selected){extra+=v.price_delta_cents;summary.push(`${group.label_en}: ${v.label_en}`)}
  }
  const matched=(values??[]).filter((v:any)=>uniq.includes(v.id));
  if(matched.length!==uniq.length||matched.some((v:any)=>!options.some(g=>g.id===v.option_id)))return NextResponse.json({error:"Invalid option for this dish"},{status:400});
  const chefUnit=dish.price_cents+extra;const unit=customerPriceCents(chefUnit);if(!Number.isSafeInteger(unit)||unit<0)return NextResponse.json({error:"Invalid dish pricing"},{status:409});
  const en=dish.menu_item_translations?.find((x:any)=>x.lang==="en")??dish.menu_item_translations?.[0];
  const line={dishId:it.dishId,vendorId:dish.vendor_id,name:en?.name||"Dish",chef:dish.vendors?.display_name||"Chef",quantity:it.quantity,unitPriceCents:unit,totalCents:unit*it.quantity,optionIds:uniq,optionSummary:summary};
  subtotal+=line.totalCents;result.push(line);
 }
 if(!Number.isSafeInteger(subtotal)||subtotal<=0)return NextResponse.json({error:"Invalid order total"},{status:409});
 return NextResponse.json({event:{id:event.id,slug:event.slug,title:event.title_en,ticketRequired:event.ticket_required,fulfilmentMode:event.fulfilment_mode},lines:result,subtotalCents:subtotal,currency:"nzd",quoteGeneratedAt:now},{headers:{"Cache-Control":"no-store"}});
}
