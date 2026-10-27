import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export default async function AdminPage(){
 const sb=await createSupabaseServerClient();const {data:{user}}=await sb.auth.getUser();
 if(!user)redirect("/sign-in");
 const {data:admin,error}=await sb.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(error||!admin)redirect("/account");
 const {data:events}=await sb.from("events").select("id,slug,title_en,is_published,starts_at").order("starts_at",{ascending:false}).limit(30);
 return <main style={{maxWidth:900,margin:"50px auto",padding:22}}>
 <h1 style={{font:"bold 42px Georgia,serif",color:"#9d2925"}}>Admin / Администратор</h1>
 <p style={{margin:"12px 0 26px"}}>Signed in as {user.email}. Only verified administrators can access this page.</p>
 <h2 style={{marginBottom:15}}>Events / События</h2>
 {events?.length?<ul style={{display:"grid",gap:10}}>{events.map(e=><li key={e.id}>{e.title_en} — {e.is_published?"Published":"Draft"}</li>)}</ul>:<p>No events yet / Пока нет событий.</p>}
 <p style={{marginTop:25}}>Event creation and chef management forms are next. / Формы управления в разработке.</p>
 <Link href="/account">← Account</Link></main>;
}