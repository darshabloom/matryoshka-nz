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
 return <main style={{padding:"45px 18px",background:"#faf6ef",minHeight:"85vh"}}><div style={{maxWidth:1050,margin:"auto"}}><nav style={{display:"flex",flexWrap:"wrap",gap:12,marginBottom:30}}><Link href="/admin" style={{display:"inline-flex",padding:"12px 17px",borderRadius:9,border:"1px solid #a32b26",background:"white",color:"#a32b26",fontWeight:700,textDecoration:"none"}}>← Back to event management / К событиям</Link></nav><h1 style={{font:"bold 43px Georgia,serif",color:"#982824",margin:"24px 0 9px"}}>Chef applications / Заявки поваров</h1><p style={{fontSize:16,color:"#776a60",lineHeight:1.6}}>Review chefs who applied to participate. To open applications, use the <strong>Open applications</strong> button on the event card in Event Management.</p><ReviewBoard initial={(rows??[]) as any}/></div></main>;
}