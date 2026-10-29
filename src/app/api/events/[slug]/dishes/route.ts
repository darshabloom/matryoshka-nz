import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_req: Request, { params }: { params: Promise<{slug:string}> }) {
 try {
  const {slug}=await params;
  const supabase=await createSupabaseServerClient();
  const now=new Date().toISOString();
  const {data:event,error:eventError}=await supabase.from("events")
   .select("id,title_en,title_ru,description_en,description_ru,starts_at,location_text,ordering_opens_at,ordering_closes_at")
   .eq("slug",slug).eq("is_published",true).gt("ends_at",now).maybeSingle();
  if(eventError)throw eventError;
  if(!event)return NextResponse.json({error:"Event unavailable"},{status:404});
  const {data:offerings,error:offerError}=await supabase.from("event_menu_items")
   .select("menu_item_id,price_cents,menu_items!inner(id,vendor_id,price_cents,is_active,menu_item_translations(lang,name,description),menu_item_options(id,label_en,label_ru,required,sort_order,menu_item_option_values(id,label_en,label_ru,price_delta_cents,sort_order)),vendors!inner(display_name))")
   .eq("event_id",event.id).eq("is_available",true).eq("menu_items.is_active",true)
   .order("sort_order",{ascending:true});
  if(offerError)throw offerError;
  type Translation={lang:string;name:string;description:string|null};
  const dishes=(offerings??[]).map((offer:any)=>{
   const item=offer.menu_items;
   const translations=(item.menu_item_translations??[]) as Translation[];
   const en=translations.find(x=>x.lang==="en");
   const ru=translations.find(x=>x.lang==="ru");
   return {menu_item_id:offer.menu_item_id,price_cents:offer.price_cents??item.price_cents,
    title_en:en?.name??ru?.name??"",title_ru:ru?.name??null,
    description_en:en?.description??null,description_ru:ru?.description??null,
    vendor_name:item.vendors?.display_name??"",
    size_options:(item.menu_item_options??[]).filter((o:any)=>o.label_en==="Size").flatMap((o:any)=>(o.menu_item_option_values??[]).sort((a:any,b:any)=>a.sort_order-b.sort_order).map((v:any)=>({id:v.id,label_en:v.label_en,label_ru:v.label_ru,price_cents:(offer.price_cents??item.price_cents)+v.price_delta_cents})))};
  });
  return NextResponse.json({event,dishes});
 } catch(error) {
  console.error("Event catalogue query failed",error);
  return NextResponse.json({error:"Unable to load event catalogue"},{status:500});
 }
}
