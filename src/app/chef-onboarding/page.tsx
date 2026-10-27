"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {createSupabaseBrowserClient} from "@/lib/supabase/client";
import {useLanguage} from "@/components/i18n/LanguageProvider";
export default function Onboard(){
 const {lang}=useLanguage(),ru=lang==="ru",router=useRouter();
 const [name,setName]=useState(""),[slug,setSlug]=useState(""),[en,setEn]=useState(""),[ruText,setRuText]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [checking,setChecking]=useState(true);
 useEffect(()=>{const sb=createSupabaseBrowserClient();sb.auth.getUser().then(async({data:{user}})=>{if(!user){router.replace("/sign-in");return}const {data}=await sb.from("vendor_users").select("vendor_id").eq("user_id",user.id).limit(1);if(data?.length){router.replace("/chef-dashboard");return}setChecking(false)})},[router]);
 async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");
  const sb=createSupabaseBrowserClient();
  const {error}=await sb.rpc("register_chef_profile",{p_slug:slug,p_name:name,p_about_en:en,p_about_ru:ruText});
  if(error){setError(error.message);setBusy(false);return}router.replace("/chef-dashboard");router.refresh();
 }
 if(checking)return <main style={{padding:40}}>Loading…</main>;
 return <main style={{background:"#faf6ef",minHeight:"85vh",padding:"50px 18px"}}><form onSubmit={save} style={{maxWidth:650,margin:"auto",background:"white",padding:"clamp(22px,5vw,45px)",borderRadius:16,border:"1px solid #e8d9c9",display:"grid",gap:18}}>
  <span style={{letterSpacing:3,color:"#9f2925",fontSize:12,fontWeight:700}}>MATRYOSHKA · CHEFS</span>
  <h1 style={{font:"bold 42px Georgia,serif",color:"#962924",margin:0}}>{ru?"Стать поваром":"Become a Chef"}</h1>
  <p style={{color:"#766c60"}}>{ru?"Создайте свой профиль и подавайте заявки на события.":"Create your kitchen profile, then apply to participate in events."}</p>
  <label>{ru?"Имя повара или кухни":"Chef or kitchen name"}<input required minLength={2} maxLength={120} value={name} onChange={e=>{const v=e.target.value;setName(v);if(!slug)setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""))}} style={{width:"100%",padding:13,marginTop:7}}/></label>
  <label>{ru?"Адрес профиля латиницей":"Profile URL (Latin characters)"}<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} onChange={e=>setSlug(e.target.value.toLowerCase())} style={{width:"100%",padding:13,marginTop:7}}/></label>
  <label>About your food · English<textarea rows={3} value={en} onChange={e=>setEn(e.target.value)} style={{width:"100%",padding:13,marginTop:7}}/></label>
  <label>О вашей кухне · Русский<textarea rows={3} value={ruText} onChange={e=>setRuText(e.target.value)} style={{width:"100%",padding:13,marginTop:7}}/></label>
  {error&&<p role="alert" style={{color:"#b12626"}}>{error}</p>}
  <button disabled={busy} style={{background:"#a22925",border:0,color:"white",padding:15,borderRadius:9,fontWeight:700,cursor:"pointer"}}>{busy?"Saving…":ru?"Создать профиль":"Create chef profile"}</button>
 </form></main>;
}