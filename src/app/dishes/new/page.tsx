import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import NewDishEditor from "./NewDishEditor";
export const dynamic="force-dynamic";
export default async function NewDishPage({searchParams}:{searchParams:Promise<{chef?:string;event?:string}>}){
 const db=await createSupabaseServerClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)redirect("/sign-in");
 const {data:admin}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(!admin)redirect("/chef-dashboard");
 const [v,e,params]=await Promise.all([
  db.from("vendors").select("id,display_name,hero_image_url").order("display_name"),
  db.from("events").select("id,title_en,title_ru").gt("ends_at",new Date().toISOString()).order("starts_at"),
  searchParams
 ]);
 return <NewDishEditor vendors={v.data??[]} events={e.data??[]} initialChefId={params.chef??""} initialEventId={params.event??""}/>;
}
