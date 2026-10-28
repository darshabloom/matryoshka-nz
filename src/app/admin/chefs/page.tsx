import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import ChefManager from "./ChefManager";
export const dynamic="force-dynamic";
export default async function ChefsAdminPage(){
 const db=await createSupabaseServerClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)redirect("/sign-in");
 const {data:admin}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(!admin)redirect("/account");
 const {data:chefs,error}=await db.from("vendors").select("id,slug,display_name,vendor_translations(lang,description),vendor_users(user_id,role)").order("display_name");
 return <main style={{minHeight:"100vh",background:"#faf6ef",padding:"45px 18px 100px"}}>
 <div style={{maxWidth:1120,margin:"auto"}}>
 <Link href="/admin" style={{color:"#99302a"}}>← Event dashboard</Link>
 <div style={{margin:"20px 0 30px"}}><span style={{letterSpacing:3,color:"#a12c27",fontWeight:700,fontSize:12}}>MATRYOSHKA · ADMIN</span>
 <h1 style={{font:"bold clamp(36px,5vw,56px) Georgia,serif",color:"#962824",margin:"12px 0"}}>Chef management / Повара</h1>
 <p style={{color:"#736861"}}>Create chef profiles and manage who can access them.</p></div>
 <ChefManager initial={chefs??[]} initialError={error?"Unable to load chefs":""}/>
 </div></main>;
}