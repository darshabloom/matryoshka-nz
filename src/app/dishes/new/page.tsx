import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import NewDishEditor from "./NewDishEditor";
export const dynamic="force-dynamic";
export default async function NewDishPage(){
 const sb=await createSupabaseServerClient();
 const {data:{user}}=await sb.auth.getUser();
 if(!user)redirect("/sign-in");
 const {data:admin}=await sb.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(!admin)redirect("/chef-dashboard");
 return <NewDishEditor/>;
}
