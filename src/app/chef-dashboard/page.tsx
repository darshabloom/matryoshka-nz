import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export default async function ChefDashboard(){
 const sb=await createSupabaseServerClient();const {data:{user}}=await sb.auth.getUser();
 if(!user)redirect("/sign-in");
 const {data:rows,error}=await sb.from("vendor_users").select("vendor_id,role").eq("user_id",user.id);
 if(error||!rows?.length)redirect("/account");
 return <main style={{maxWidth:800,margin:"50px auto",padding:22}}>
 <h1 style={{font:"bold 40px Georgia,serif",color:"#9d2925"}}>Chef dashboard / Кабинет повара</h1>
 <p>Your chef membership is active. Food editing and event tools are coming next.</p>
 <p>Вы вошли как повар. Управление блюдами и событиями появится здесь.</p>
 <Link href="/account">← Account</Link></main>;
}