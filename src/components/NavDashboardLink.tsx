import Link from "next/link";
import {createSupabaseServerClient} from "@/lib/supabase/server";
export default async function NavDashboardLink(){
 const db=await createSupabaseServerClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return <Link href="/sign-in" style={{color:"#a52625",fontWeight:700}}>Sign in / Войти</Link>;
 const {data:admin}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 let url="/account";
 if(admin)url="/admin";
 else {const {data:chef}=await db.from("vendor_users").select("vendor_id").eq("user_id",user.id).limit(1);if(chef?.length)url="/chef-dashboard";}
 return <Link href={url} style={{color:"#a52625",fontWeight:700}}>My Dashboard / Мой кабинет</Link>;
}