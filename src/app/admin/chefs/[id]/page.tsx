import Link from "next/link";
import {redirect,notFound} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import ChefDetailEditor from "./ChefDetailEditor";
export const dynamic="force-dynamic";
export default async function ChefDetailPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const db=await createSupabaseServerClient();
 const {data:{user}}=await db.auth.getUser();if(!user)redirect("/sign-in");
 const {data:admin}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();if(!admin)redirect("/account");
 const [chefResult,dishesResult,availableResult]=await Promise.all([
  db.from("vendors").select("id,display_name,slug,phone,instagram_handle,hero_image_url,area_code,vendor_translations(lang,tagline,description,about)").eq("id",id).maybeSingle(),
  db.from("menu_items").select("id,vendor_id,approval_status,price_cents,menu_item_translations(lang,name)").eq("vendor_id",id).order("created_at",{ascending:false}),
  db.from("menu_items").select("id,vendor_id,approval_status,menu_item_translations(lang,name)").is("vendor_id",null).order("created_at",{ascending:false})
 ]);
 if(!chefResult.data)notFound();
 return <main className="min-h-screen bg-[#faf6ef] p-5 text-[#2e2420]"><div className="mx-auto max-w-5xl">
 <Link href="/admin?tab=chefs" className="text-[#9d302a] underline">← Back to chefs</Link>
 <ChefDetailEditor chef={chefResult.data as any} dishes={(dishesResult.data??[]) as any} available={(availableResult.data??[]) as any}/>
 </div></main>;
}
