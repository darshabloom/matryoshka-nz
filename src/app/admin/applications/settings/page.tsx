import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import Settings from "./Settings";
export const dynamic="force-dynamic";
export default async function Page(){
 const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/sign-in");
 const {data:admin}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();if(!admin)redirect("/account");
 const {data:events}=await db.from("events").select("id,title_en,title_ru,is_published,chef_applications_open,chef_application_deadline").order("starts_at",{ascending:false});
 return <main style={{background:"#faf6ef",minHeight:"85vh",padding:"45px 18px"}}><div style={{maxWidth:950,margin:"auto"}}><Link href="/admin/applications">← Applications</Link><h1 style={{font:"bold 40px Georgia,serif",color:"#9b2b26",margin:"25px 0"}}>Chef application settings / Приём заявок</h1><Settings events={(events??[]) as any}/></div></main>;
}