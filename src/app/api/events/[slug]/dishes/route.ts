import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {serviceClient} from "@/lib/server/checkout-security";
export const dynamic="force-dynamic";
export async function GET(_req:Request,{params}:{params:Promise<{slug:string}>}){
 try{
  // The QA fixture remains invisible under shared production RLS. Only this protected
// preview branch may read it with the server-only service key; real events use RLS.
  const {slug}=await params;
  const qaPreview=process.env.VERCEL_ENV==="preview"&&process.env.VERCEL_GIT_COMMIT_REF==="redesign/food-first-home"&&process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")===true;
  const db=qaPreview&&slug==="test-sandbox-checkout"?serviceClient():await createSupabaseServerClient(),now=new Date().toISOString();
  const {data:{user}}=await db.auth.getUser();
  const {data:admin}=user?await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle():{data:null};
  const isAdmin=!!admin;
  const eventQuery=db.from("events").select("id,slug,is_published,title_en,title_ru,description_en,description_ru,starts_at,ends_at,location_text,ordering_opens_at,ordering_closes_at,external_ticket_url,ticket_required,fulfilment_mode,ordering_enabled").eq("slug",slug).gt("ends_at",now);
  const {data:event,error}=await (isAdmin?eventQuery:eventQuery.eq("is_published",true)).maybeSingle();
  if(error)throw error;if(!event)return NextResponse.json({error:"Event unavailable"},{status:404});
  const {data:offers,error:oe}=await db.from("event_menu_items")
   .select("menu_item_id,max_quantity,menu_items!inner(id,vendor_id,price_cents,is_active,approval_status,allergen_review_complete,ingredients_text,allergen_statement,cross_contact_statement,portion_label,menu_item_translations(lang,name,description),vendors!inner(display_name))")
   .eq("event_id",event.id).eq("is_available",true).eq("menu_items.is_active",true).eq("menu_items.approval_status","approved").order("sort_order");
  if(oe)throw oe;
  const eligible=(offers??[]).filter((o:any)=>o.menu_items?.allergen_review_complete&&o.menu_items?.ingredients_text?.trim());
  const ids=eligible.map((o:any)=>o.menu_item_id);
  const [images,groups,cats]=ids.length?await Promise.all([
   db.from("menu_item_images").select("menu_item_id,image_url,sort_order").in("menu_item_id",ids).order("sort_order"),
   db.from("menu_item_options").select("id,menu_item_id,label_en,label_ru,required,min_select,max_select,sort_order").in("menu_item_id",ids).order("sort_order"),
   db.from("menu_item_categories").select("menu_item_id,food_categories(label_en,label_ru,slug)").in("menu_item_id",ids)
  ]):[{data:[]},{data:[]},{data:[]}];
  const groupIds=(groups.data??[]).map(x=>x.id);
  const {data:values}=groupIds.length?await db.from("menu_item_option_values").select("id,option_id,label_en,label_ru,price_delta_cents,sort_order").in("option_id",groupIds).order("sort_order"):{data:[] as any[]};
  const dishes=eligible.map((offer:any)=>{
   const item=offer.menu_items,trs=item.menu_item_translations??[];
   const en=trs.find((x:any)=>x.lang==="en"),ru=trs.find((x:any)=>x.lang==="ru");
   return {
    menu_item_id:item.id,vendor_id:item.vendor_id,
    title_en:en?.name??ru?.name??"",title_ru:ru?.name??en?.name??null,
    description_en:en?.description??ru?.description??"",description_ru:ru?.description??en?.description??"",
    vendor_name:item.vendors.display_name,price_cents:item.price_cents,
    ingredients:item.ingredients_text,allergens:item.allergen_statement,cross_contact:item.cross_contact_statement,portion:item.portion_label,
    max_quantity:offer.max_quantity,
    categories:(cats.data??[]).filter((c:any)=>c.menu_item_id===item.id).map((c:any)=>c.food_categories).filter(Boolean),
    images:(images.data??[]).filter(x=>x.menu_item_id===item.id).map(x=>x.image_url).slice(0,3),
    options:(groups.data??[]).filter(g=>g.menu_item_id===item.id).map(g=>({
      id:g.id,label_en:g.label_en,label_ru:g.label_ru,required:g.required,min_select:g.min_select,max_select:g.max_select,
      values:(values??[]).filter((v:any)=>v.option_id===g.id).map((v:any)=>({id:v.id,label_en:v.label_en,label_ru:v.label_ru,price_delta_cents:v.price_delta_cents}))
    }))
   };
  });
  const orderingOpen=event.is_published&&event.ordering_enabled&&(!event.ordering_opens_at||new Date(event.ordering_opens_at)<=new Date())&&(!event.ordering_closes_at||new Date(event.ordering_closes_at)>new Date());
  return NextResponse.json({event:{...event,ordering_open:orderingOpen},dishes},{headers:{"Cache-Control":"no-store"}});
 }catch(e){console.error("Event menu error",e);return NextResponse.json({error:"Unable to load event menu"},{status:500})}
}
