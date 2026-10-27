import Link from "next/link";
import {redirect} from "next/navigation";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import ApplicationForm from "./ApplicationForm";
export const dynamic="force-dynamic";
export default async function ChefDashboard(){
 const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/sign-in");
 const {data:membership}=await db.from("vendor_users").select("vendor_id,role,vendors(display_name)").eq("user_id",user.id).limit(1);
 if(!membership?.length)redirect("/chef-onboarding");
 const vendorId=membership[0].vendor_id;
 const [events,applications]=await Promise.all([
 db.from("events").select("id,title_en,title_ru,starts_at,chef_application_deadline,chef_fulfilment_options").eq("chef_applications_open",true).gt("ends_at",new Date().toISOString()).order("starts_at"),
 db.from("chef_event_applications").select("id,event_id,status,review_note,events(title_en,title_ru)").eq("vendor_id",vendorId)
 ]);
 return <main style={{background:"#faf6ef",minHeight:"85vh",padding:"48px 18px"}}><div style={{maxWidth:1000,margin:"auto"}}>
 <Link href="/account">← Account / Аккаунт</Link><span style={{display:"block",marginTop:28,color:"#a32c26",letterSpacing:3,fontWeight:700,fontSize:12}}>MATRYOSHKA · CHEFS</span>
 <h1 style={{font:"bold clamp(34px,5vw,52px) Georgia,serif",color:"#982824",margin:"10px 0"}}>Chef dashboard / Кабинет повара</h1>
 <p style={{color:"#76695d"}}>Apply to events and follow your application status.</p>
 <ApplicationForm vendorId={vendorId} availableEvents={(events.data??[]) as any} initialApplications={(applications.data??[]) as any}/>
 </div></main>;

}
