import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import ReviewBoard from "./ReviewBoard";
export const dynamic="force-dynamic";
export default async function Applications(){
 const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();
 if(!user)redirect("/sign-in");
 const {data:a}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();if(!a)redirect("/account");
 const {data:rows}=await db.from("chef_event_applications").select("id,status,message,fulfilment,review_note,created_at,events(title_en,title_ru),vendors(display_name)").order("created_at",{ascending:false});
 return <main style={{padding:"45px 18px",background:"#faf6ef",minHeight:"85vh"}}><div style={{maxWidth:1050,margin:"auto"}}><Link href="/admin">← Events</Link><h1 style={{font:"bold 43px Georgia,serif",color:"#982824",margin:"24px 0 9px"}}>Chef applications / Заявки поваров</h1><p>Review requests to participate in your events.</p><ReviewBoard initial={(rows??[]) as any}/></div></main>;
}