import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase/server";
export const dynamic="force-dynamic";
type Translation={lang:string;name:string;description:string|null};
type Image={image_url:string;sort_order:number};
type Category={food_categories:{slug:string;label_en:string;label_ru:string|null}|null};
export async function GET(){
 try{
  const db=await createSupabaseServerClient();
  const {data, error}=await db.from("menu_items")
   .select("id,price_cents,ingredients_text,allergen_statement,allergen_review_complete,vendors!inner(display_name,slug,hero_image_url),menu_item_translations(lang,name,description),menu_item_images(image_url,sort_order),menu_item_categories(food_categories(slug,label_en,label_ru))")
   .eq("approval_status","approved").eq("is_active",true).order("sort_order",{ascending:true});
  if(error)throw error;
  const dishes=(data??[]).flatMap((item:any)=>{
   const trs=(item.menu_item_translations??[]) as Translation[];
   const en=trs.find(x=>x.lang==="en"),ru=trs.find(x=>x.lang==="ru");
   const titleEn=en?.name??ru?.name??"";
   const titleRu=ru?.name??en?.name??"";
   // Hidden fixtures are never part of the public menu.
   if(!titleEn&&!titleRu||/\btest\s*only\b|\bnot\s*for\s*sale\b|\[тест\]|не прода[её]тся/i.test(titleEn+" "+titleRu))return [];
   const photos=((item.menu_item_images??[]) as Image[]).sort((a,b)=>a.sort_order-b.sort_order);
   const categories=((item.menu_item_categories??[]) as Category[]).map(x=>x.food_categories).filter(Boolean);
   const ready=!!item.allergen_review_complete&&!!item.ingredients_text?.trim()&&!!item.allergen_statement?.trim();
   const vendor=item.vendors as {display_name:string;slug:string;hero_image_url:string|null};
   return [{id:item.id,name_en:titleEn,name_ru:titleRu,
    description_en:en?.description??ru?.description??"",description_ru:ru?.description??en?.description??"",
    price_cents:item.price_cents,chef:vendor.display_name,chef_slug:vendor.slug,
    chef_photo:vendor.hero_image_url??null,image:photos[0]?.image_url??null,
    categories,ready}];
  });
  return NextResponse.json({dishes},{headers:{"Cache-Control":"no-store"}});
 }catch(e){console.error("Public menu unavailable",e);return NextResponse.json({error:"Unable to load real menu"},{status:500})}
}
