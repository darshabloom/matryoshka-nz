import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import SignOut from "./sign-out";
export const dynamic="force-dynamic";
export default async function Account(){
 const sb=await createSupabaseServerClient();const {data:{user}}=await sb.auth.getUser();
 if(!user)redirect("/sign-in");
 const [a,c]=await Promise.all([sb.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle(),sb.from("vendor_users").select("vendor_id").eq("user_id",user.id)]);
 return <main style={{maxWidth:780,margin:"55px auto",padding:22}}>
 <h1 style={{font:"bold 40px Georgia,serif",color:"#962824"}}>My account / Мой аккаунт</h1>
 <p style={{margin:"20px 0"}}>{user.email}</p>
 <div style={{display:"flex",flexWrap:"wrap",gap:16,marginBottom:24}}>
 {a.data&&<Link href="/admin">Admin dashboard / Администратор →</Link>}
 {!!c.data?.length&&<Link href="/chef-dashboard">Chef dashboard / Кабинет повара →</Link>}
 <Link href="/events">Events / События →</Link></div>
 {!a.data&&!c.data?.length&&<p style={{marginBottom:24}}>Customer account ready. Order history will appear when checkout launches. / Аккаунт покупателя создан.</p>}
 <SignOut/></main>;
}