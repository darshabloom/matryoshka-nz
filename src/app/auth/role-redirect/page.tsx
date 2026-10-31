import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export default async function RoleRedirect(){
 const db=await createSupabaseServerClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)redirect("/sign-in");
 const {data:admin}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(admin)redirect("/admin");
 await db.rpc("claim_invited_chef_google");
 const {data:chef}=await db.from("vendor_users").select("vendor_id").eq("user_id",user.id).limit(1);
 if(chef?.length)redirect("/chef-dashboard");
 redirect("/account");
}