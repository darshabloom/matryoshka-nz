import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import EventManager from "./EventManager";
export const dynamic="force-dynamic";
export default async function AdminPage(){
 const sb=await createSupabaseServerClient();
 const {data:{user}}=await sb.auth.getUser();
 if(!user)redirect("/sign-in");
 const {data:admin,error:permissionError}=await sb.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(permissionError||!admin)redirect("/account");
 const {data:events,error}=await sb.from("events").select("id,slug,title_en,title_ru,description_en,description_ru,starts_at,ends_at,ordering_opens_at,ordering_closes_at,location_text,external_ticket_url,is_published,chef_applications_open,chef_fulfilment_options").order("starts_at",{ascending:false});
 return <EventManager initialEvents={events??[]} email={user.email??""} initialError={error?"Unable to load events":""}/>;
}