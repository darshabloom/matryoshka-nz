import Link from "next/link";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import AccountAvatarMenu from "./AccountAvatarMenu";
export default async function NavDashboardLink(){
 const db=await createSupabaseServerClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return <Link href="/sign-in" style={{background:"#a52d27",color:"white",padding:"12px 19px",borderRadius:9,fontWeight:800,textDecoration:"none",whiteSpace:"nowrap"}}>Sign in / Войти</Link>;
 const {data:admin}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 let url="/account";
 let chefPhoto:string|null=null;
 if(admin)url="/admin";
 else {const {data:chef}=await db.from("vendor_users").select("vendor_id").eq("user_id",user.id).limit(1);
  if(chef?.length){url="/chef-dashboard";const {data:vendor}=await db.from("vendors").select("hero_image_url").eq("id",chef[0].vendor_id).maybeSingle();chefPhoto=vendor?.hero_image_url??null;}}
 const avatar=typeof user.user_metadata?.avatar_url==="string"?user.user_metadata.avatar_url:chefPhoto;
 return <AccountAvatarMenu email={user.email??"M"} dashboard={url} avatar={avatar}/>;
}