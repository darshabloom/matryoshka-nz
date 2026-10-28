import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase/server";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Item={dishId:string;quantity:number;optionIds:string[]};
export async function POST(req:Request){
 let body:any;try{body=await req.json()}catch{return NextResponse.json({error:"Invalid checkout request"},{status:400})}
 const raw=body?.items;if(!UUID.test(body?.eventId??"")||!Array.isArray(raw)||raw.length<1||raw.length>40)return NextResponse.json({error:"Choose an event and 1–40 dishes"},{status:400});
 const items:Item[]=raw.map((x:any)=>({dishId:x?.dishId,quantity:x?.quantity,optionIds:x?.optionIds}));
 if(items.some(x=>!UUID.test(x.dishId)||!Number.isInteger(x.quantity)||x.quantity<1||x.quantity>100||!Array.isArray(x.optionIds)||x.optionIds.length>30||x.optionIds.some((id:any)=>!UUID.test(id))))return NextResponse.json({error:"Invalid dish selection or quantity"},{status:400});
 const db=await createSupabaseServerClient(),now=new Date().toISOString();
 const {data:event}=await db.from("events").select("id,slug,title_en,title_ru,is_published,starts_at,ends_at,ordering_opens_at,ordering_closes_at,ticket_required,fulfilment_mode").eq("id",body.eventId).eq("is_published",true).gt("ends_at",now).maybeSingle();
 if(!event||!event.ordering_enabled)return NextResponse.json({error:"Food ordering is not open for this event"},{status:409});
 if(event.ordering_opens_at&&event.ordering_opens_at>now||event.ordering_closes_at&&event.ordering_closes_at<=now)return NextResponse.json({error:"Food ordering is currently closed"},{status:409});
 const {data:offers,error:offerErr}=await db.from("event_menu_items").select("menu_item_id,is_available,max_quantity,menu_items!inner(id,vendor_id,price_cents,is_active,approval_status,allergen_review_complete,ingredients_text,menu_item_translations(lang,name),vendors(display_name))").eq("event_id",event.id).in("menu_item_id",items.map(i=>i.dishId));
 if(offerErr)return NextResponse.json({error:"Could not check menu availability"},{status:500});
 const groupIds=items.map(i=>i.dishId);
 const {data:groups,error:ge}=await db.from("menu_item_options").select("id,menu_item_id,required,min_select,max_select,label_en,label_ru").in("menu_item_id",groupIds);
 if(ge)return NextResponse.json({error:"Could not verify dish options"},{status:500});
 const {data:values}=groups?.length?await db.from("menu_item_option_values").select("id,option_id,label_en,label_ru,price_delta_cents").in("option_id",groups.map(g=>g.id)):{data:[] as any[]};
 const result:any[]=[];let subtotal=0;
 for(const it of items){
  const offer=(offers??[]).find((o:any)=>o.menu_item_id===it.dishId);
  const dish=(offer as any)?.menu_items;
  if(!offer||!offer.is_available||!dish||!dish.is_active||dish.approval_status!=="approved"||!dish.allergen_review_complete||!dish.ingredients_text?.trim())return NextResponse.json({error:"Some items are no longer available or have incomplete allergen information. Please review your basket."},{status:409});
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
  const unit=dish.price_cents+extra;if(!Number.isSafeInteger(unit)||unit<0)return NextResponse.json({error:"Invalid dish pricing"},{status:409});
  const en=dish.menu_item_translations?.find((x:any)=>x.lang==="en")??dish.menu_item_translations?.[0];
  const line={dishId:it.dishId,vendorId:dish.vendor_id,name:en?.name||"Dish",chef:dish.vendors?.display_name||"Chef",quantity:it.quantity,unitPriceCents:unit,totalCents:unit*it.quantity,optionIds:uniq,optionSummary:summary};
  subtotal+=line.totalCents;result.push(line);
 }
 if(!Number.isSafeInteger(subtotal)||subtotal<=0)return NextResponse.json({error:"Invalid order total"},{status:409});
 return NextResponse.json({event:{id:event.id,slug:event.slug,title:event.title_en,ticketRequired:event.ticket_required,fulfilmentMode:event.fulfilment_mode},lines:result,subtotalCents:subtotal,currency:"nzd",quoteGeneratedAt:now},{headers:{"Cache-Control":"no-store"}});
}
