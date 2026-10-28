import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import DishManager from "./DishManager";
export const dynamic="force-dynamic";
export default async function Page(){
 const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/sign-in");
 const {data:admin}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 const {data:members}=await db.from("vendor_users").select("vendor_id").eq("user_id",user.id);
 if(!admin&&!members?.length)redirect("/chef-onboarding");
 const vendorIds=(members??[]).map(m=>m.vendor_id);
 const [vendorsResult,dishesResult,applicationsResult,eventsResult,inclusionsResult]=await Promise.all([
  db.from("vendors").select("id,display_name").order("display_name"),
  admin?db.from("menu_items").select("id,vendor_id,price_cents,approval_status,review_note,menu_item_translations(lang,name,description)").order("created_at",{ascending:false}):db.from("menu_items").select("id,vendor_id,price_cents,approval_status,review_note,menu_item_translations(lang,name,description)").in("vendor_id",vendorIds).order("created_at",{ascending:false}),
  admin?db.from("chef_event_applications").select("vendor_id,event_id,status").eq("status","approved"):db.from("chef_event_applications").select("vendor_id,event_id,status").in("vendor_id",vendorIds).eq("status","approved"),
  db.from("events").select("id,title_en,title_ru,starts_at").gt("ends_at",new Date().toISOString()).order("starts_at"),
  db.from("event_menu_items").select("event_id,menu_item_id")
 ]);
 const allowedVendors=admin?vendorsResult.data??[]:(vendorsResult.data??[]).filter(v=>vendorIds.includes(v.id));
 const allowedEvents=admin?eventsResult.data??[]:(eventsResult.data??[]).filter(e=>(applicationsResult.data??[]).some(a=>a.event_id===e.id));
 return <DishManager isAdmin={!!admin} vendors={allowedVendors} dishes={(dishesResult.data??[]) as any} events={allowedEvents} inclusions={inclusionsResult.data??[]} initialError={dishesResult.error?.message??""}/>;
}