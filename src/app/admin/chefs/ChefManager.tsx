"use client";
import Link from "next/link";
import {useState} from "react";
import {useLanguage} from "@/components/i18n/LanguageProvider";
type Chef={id:string;slug:string;display_name:string;vendor_translations:{lang:string;description:string|null}[];vendor_users:{user_id:string;role:string}[]};
const field:React.CSSProperties={width:"100%",border:"1px solid #d8c9bf",padding:"13px 14px",borderRadius:9,background:"#fff",fontSize:15};
const btn:React.CSSProperties={border:0,borderRadius:9,padding:"12px 19px",background:"#a42b26",color:"#fff",fontWeight:700,cursor:"pointer"};
export default function ChefManager({initial,initialError}:{initial:Chef[];initialError:string}){
 const {lang}=useLanguage();const ru=lang==="ru";const t=(en:string,ruText:string)=>ru?ruText:en;
 const [rows,setRows]=useState(initial);const [name,setName]=useState("");const [slug,setSlug]=useState("");const [en,setEn]=useState("");const [ruText,setRuText]=useState("");
 const [linkIds,setLinkIds]=useState<Record<string,string>>({});const [error,setError]=useState(initialError);const [notice,setNotice]=useState("");const [busy,setBusy]=useState(false);
 const refresh=()=>window.location.reload();
 async function request(method:"POST"|"PATCH",body:object){
  setBusy(true);setError("");setNotice("");
  try{const res=await fetch("/api/admin/chefs",{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const result=await res.json();
   if(!res.ok||res.status===207)throw Error(result.error||"Unable to save");
   refresh();
  }catch(e){setError(e instanceof Error?e.message:"Unable to save");setBusy(false);}
 }
 function add(e:React.FormEvent){e.preventDefault();void request("POST",{name,slug,about_en:en,about_ru:ruText});}
 return <div style={{display:"grid",gap:28}}>
  <section style={{border:"1px solid #e6d9cc",borderRadius:15,background:"#fff",padding:24,boxShadow:"0 6px 26px #4024170a"}}>
   <h2 style={{font:"bold 29px Georgia,serif",margin:"0 0 9px"}}>{t("Add a chef","Добавить повара")}</h2>
   <p style={{color:"#786e64",fontSize:14,marginBottom:20}}>{t("Create a profile now. Link their login after they sign in.","Создайте профиль, а затем привяжите учётную запись после первого входа.")}</p>
   <form onSubmit={add} style={{display:"grid",gap:15}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:15}}>
     <label>{t("Chef display name","Имя повара")}<input required maxLength={120} style={field} value={name} onChange={e=>{const v=e.target.value;setName(v);if(!slug)setSlug(v.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""))}}/></label>
     <label>{t("Profile URL slug","Адрес профиля")}<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" style={field} value={slug} onChange={e=>setSlug(e.target.value.toLowerCase())}/></label>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:15}}>
     <label>{t("About chef · English","Описание · английский")}<textarea rows={3} style={field} value={en} onChange={e=>setEn(e.target.value)}/></label>
     <label>{t("About chef · Russian","Описание · русский")}<textarea rows={3} style={field} value={ruText} onChange={e=>setRuText(e.target.value)}/></label>
    </div><div><button disabled={busy} style={btn}>{busy?t("Saving…","Сохранение…"):t("Create chef profile","Создать профиль повара")}</button></div>
   </form>
  </section>
  <section><h2 style={{font:"bold 29px Georgia,serif",margin:"0 0 20px"}}>{t("Your chefs","Ваши повара")} <span style={{font:"16px Arial,sans-serif",color:"#a12c27"}}>({rows.length})</span></h2>
   {rows.length===0?<div style={{padding:45,textAlign:"center",background:"white",border:"1px solid #e6d9cc",borderRadius:14,color:"#766f68"}}>{t("No chef profiles yet. Create the first one above.","Пока нет поваров. Добавьте первого выше.")}</div>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:17}}>{rows.map(c=><article key={c.id} style={{padding:24,background:"white",border:"1px solid #e6d9cc",borderRadius:14}}>
     <div style={{width:56,height:56,borderRadius:"50%",background:"#f1e0ce",color:"#9d302a",display:"grid",placeItems:"center",fontSize:29}}>✿</div>
     <h3 style={{font:"bold 25px Georgia,serif",margin:"13px 0 5px"}}><Link href={`/admin/chefs/${c.id}`} style={{color:"#a32d27",textDecoration:"underline"}}>{c.display_name}</Link></h3><p style={{color:"#81776c",fontSize:13}}>/{c.slug}</p><Link href={`/admin/chefs/${c.id}`} style={{display:"inline-block",margin:"10px 0",color:"#a32d27",fontWeight:700}}>{t("Manage profile & dishes →","Профиль и блюда →")}</Link>
     <p style={{fontSize:13,margin:"14px 0",color:c.vendor_users.length?"#32724a":"#a37230"}}>{c.vendor_users.length?t("Account linked","Аккаунт привязан"):t("Awaiting chef login","Ожидает входа повара")}</p>
     <label style={{fontSize:12}}>{t("Chef's Supabase user ID (after sign-in)","ID пользователя Supabase (после входа)")}<input style={{...field,marginTop:7,fontSize:12}} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={linkIds[c.id]??""} onChange={e=>setLinkIds(old=>({...old,[c.id]:e.target.value}))}/></label>
     <button disabled={busy||!linkIds[c.id]} style={{...btn,marginTop:12}} onClick={()=>void request("PATCH",{action:"link",vendor_id:c.id,user_id:linkIds[c.id]})}>{t("Grant chef access","Выдать доступ повару")}</button>
     {c.vendor_users.map(v=><div key={v.user_id} style={{fontSize:11,marginTop:13,overflowWrap:"anywhere"}}>{v.user_id} <button disabled={busy} style={{border:0,background:"none",color:"#a32926",textDecoration:"underline",cursor:"pointer"}} onClick={()=>{if(window.confirm(t("Remove this account's chef access?","Удалить доступ повара?")))void request("PATCH",{action:"unlink",vendor_id:c.id,user_id:v.user_id})}}>{t("Remove","Удалить")}</button></div>)}
    </article>)}</div>}
  </section>
  {error&&<p role="alert" style={{color:"#a42121",padding:14,background:"#fff0ed",borderRadius:8}}>{error}</p>}
  {notice&&<p role="status">{notice}</p>}
 </div>;
}