import {redirect,notFound} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import CustomerDishEditor from "./CustomerDishEditor";
export const dynamic="force-dynamic";
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{event?:string}>}){
 const {id}=await params,{event}=await searchParams;
 const db=await createSupabaseServerClient(),{data:{user}}=await db.auth.getUser();
 if(!user)redirect("/sign-in");
 const {data:admin}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 const {data:dish}=await db.from("menu_items")
  .select("id,vendor_id,price_cents,approval_status,ingredients_text,ingredients_en,ingredients_ru,allergen_statement,cross_contact_statement,portion_label,allergen_review_complete,menu_item_translations(lang,name,description),menu_item_images(id,image_url,sort_order,position_x,position_y,zoom_percent,crop_mode)")
  .eq("id",id).maybeSingle();
 if(!dish)notFound();
 if(!admin){
  const {data:member}=await db.from("vendor_users").select("vendor_id").eq("user_id",user.id).eq("vendor_id",dish.vendor_id).maybeSingle();
  if(!member)notFound();
 }
 const [vendorsResult,eventsResult,optionsResult]=await Promise.all([
  db.from("vendors").select("id,display_name,slug,hero_image_url").order("display_name"),
  db.from("events").select("id,title_en,title_ru").gt("ends_at",new Date().toISOString()).order("starts_at"),
  db.from("menu_item_options").select("id,label_en,label_ru,required,min_select,max_select,sort_order,menu_item_option_values(id,label_en,label_ru,price_delta_cents,sort_order)").eq("menu_item_id",id).order("sort_order")
 ]);
 const memberIds=admin?null:(await db.from("vendor_users").select("vendor_id").eq("user_id",user.id)).data?.map(x=>x.vendor_id)??[];
 const vendors=admin?vendorsResult.data??[]:(vendorsResult.data??[]).filter(v=>memberIds?.includes(v.id));
 return <CustomerDishEditor dish={dish as any} isAdmin={!!admin} vendors={vendors} events={admin?eventsResult.data??[]:[]} options={(optionsResult.data??[]) as any} initialEventId={event??""}/>;
}
