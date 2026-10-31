"use client";
import {useEffect,useState} from "react";
import {createSupabaseBrowserClient} from "@/lib/supabase/client";
import {useLanguage} from "@/components/i18n/LanguageProvider";
export default function GoogleChefLink({vendorId}:{vendorId:string}){
 const {lang}=useLanguage(),ru=lang==="ru";
 const [password,setPassword]=useState(""),[passwordMessage,setPasswordMessage]=useState(""),[passwordError,setPasswordError]=useState("");
 const [email,setEmail]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
 const [overview,setOverview]=useState<{invitation:{email:string}|null;accounts:{user_id:string;email:string;role:string;last_sign_in_at:string|null;google_identity:boolean}[];activity:{activity:string;detail:string|null;occurred_at:string}[]}|null>(null);
 async function reload(){const db=createSupabaseBrowserClient();const {data,error:e}=await db.rpc("admin_chef_google_overview",{p_vendor_id:vendorId});if(e)setError(e.message);else setOverview(data);}
 useEffect(()=>{void reload();},[vendorId]);
 async function revoke(userId:string){if(!window.confirm(ru?"Отозвать доступ этого пользователя?":"Revoke this account's access?"))return;setBusy(true);setError("");const db=createSupabaseBrowserClient();const {error:e}=await db.rpc("admin_manage_chef_google",{p_vendor_id:vendorId,p_action:"revoke",p_user_id:userId});if(e)setError(e.message);else{setMessage(ru?"Доступ отозван.":"Access revoked.");await reload();}setBusy(false);}
 async function cancelInvitation(){setBusy(true);setError("");const db=createSupabaseBrowserClient();const {error:e}=await db.rpc("admin_manage_chef_google",{p_vendor_id:vendorId,p_action:"cancel_invitation"});if(e)setError(e.message);else{setMessage(ru?"Приглашение отменено.":"Invitation cancelled.");await reload();}setBusy(false);}
 async function link(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError("");setMessage("");
  const db=createSupabaseBrowserClient();
  const {data,error:linkError}=await db.rpc("admin_manage_chef_google",{p_vendor_id:vendorId,p_action:"invite",p_email:email.trim()});
  if(linkError)setError(linkError.message);
  else{setMessage(data==="connected"?(ru?"Google-аккаунт подключён.":"Google account connected."):(ru?"Приглашение сохранено. Аккаунт подключится при первом входе через Google.":"Invitation saved. The account will link automatically on first Google sign-in."));await reload();}
  setBusy(false);
 }
 async function assignPassword(e:React.FormEvent){
  e.preventDefault();setBusy(true);setPasswordMessage("");setPasswordError("");
  try{
   const response=await fetch("/api/admin/vendor-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({vendorId,email:email.trim(),password})});
   const result=await response.json();
   if(!response.ok) setPasswordError(result.error??"Password could not be saved.");
   else {setPassword("");setPasswordMessage(ru?"Пароль установлен. Google-вход остаётся доступным.":"Password saved to the existing chef account. Google sign-in remains available.");}
  }catch{setPasswordError(ru?"Ошибка соединения. Попробуйте снова.":"Connection failed. Try again.");}
  setBusy(false);
 }
 return <section className="rounded-xl bg-white p-6 shadow-sm">
  <h2 className="mb-3 text-2xl font-bold">{ru?"Доступ через Google":"Google account access"}</h2>
  <p className="mb-4 text-sm text-[#796b62]">{ru?"Пригласите повара по Google email до первого входа.":"Enter the chef's Google email now; their verified account will connect automatically when they first sign in."}</p>
  <div className="mb-5 space-y-3">
    {overview?.accounts.map(a=><div key={a.user_id} className="rounded-lg border border-[#e8dcd3] p-3">
      <p className="font-semibold">{a.email}</p>
      <p className="text-sm">{a.google_identity?"Google · ":""}{a.role} · {ru?"Подключён":"Connected"}</p>
      <p className="text-sm text-[#796b62]">{ru?"Последний вход":"Last sign-in"}: {a.last_sign_in_at?new Date(a.last_sign_in_at).toLocaleString(ru?"ru-RU":"en-NZ",{timeZone:"Pacific/Auckland"}):"—"}</p>
      <button type="button" disabled={busy} className="mt-2 text-[#a32d27] underline" onClick={()=>void revoke(a.user_id)}>{ru?"Отозвать доступ":"Unlink / Revoke access"}</button>
    </div>)}
    {overview?.invitation&&<div className="rounded-lg border border-[#e8dcd3] p-3"><p>{ru?"Приглашённый email":"Invited email"}: <strong>{overview.invitation.email}</strong></p><p className="text-sm text-[#796b62]">{overview.accounts.some(a=>a.email.toLowerCase()===overview.invitation?.email.toLowerCase())?(ru?"Подключён":"Connected"):(ru?"Ожидает первого входа":"Awaiting first sign-in")}</p><button type="button" disabled={busy} className="text-[#a32d27] underline" onClick={()=>void cancelInvitation()}>{ru?"Отменить приглашение":"Cancel invitation"}</button></div>}
  </div>
  <form onSubmit={link} className="flex flex-wrap items-end gap-3">
   <label className="min-w-[220px] flex-1 text-sm font-semibold">{ru?"Адрес Google":"Google email address"}<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-[#d8c9bf] p-3" placeholder="chef@gmail.com"/></label>
   <button type="submit" disabled={busy} className="rounded-lg bg-[#a32d27] px-5 py-3 font-semibold text-white disabled:opacity-50">{busy?"…":ru?"Пригласить / подключить":"Invite / Link Google account"}</button>
  </form>
  {error&&<p role="alert" className="mt-3 text-red-700">{error}</p>}
  {message&&<p role="status" className="mt-3 text-green-800">{message}</p>}
  <div className="mt-6 border-t border-[#e8dcd3] pt-4"><h3 className="text-lg font-bold">{ru?"История активности":"Account & activity history"}</h3>
  <p className="mb-3 text-xs text-[#796b62]">{ru?"История начинается с момента включения аудита.":"Audit history starts when tracking was enabled. Last sign-in comes from Supabase Auth."}</p>
  {overview?.activity.length?<div className="max-h-80 overflow-auto">{overview.activity.map((a,i)=><div key={i} className="border-b border-[#eee] py-2 text-sm"><strong>{a.activity.replaceAll("_"," ")}</strong> {a.detail??""}<p className="text-[#796b62]">{new Date(a.occurred_at).toLocaleString(ru?"ru-RU":"en-NZ",{timeZone:"Pacific/Auckland"})}</p></div>)}</div>:<p className="text-sm text-[#796b62]">{ru?"Пока нет записей.":"No tracked activity yet."}</p>}
  </div>
  <div className="mt-8 border-t border-[#e8dcd3] pt-6">
   <h2 className="mb-3 text-2xl font-bold">{ru?"Пароль повара":"Set chef password"}</h2>
   <p className="mb-4 text-sm text-[#796b62]">{ru?"Укажите адрес, который уже привязан к этому повару, и задайте пароль не короче 12 символов. Google-вход сохранится.":"Enter the email already linked to this chef and choose a password of at least 12 characters. Their Google sign-in stays active."}</p>
   <form onSubmit={assignPassword} className="flex flex-wrap items-end gap-3">
    <label className="min-w-[220px] flex-1 text-sm font-semibold">{ru?"Эл. почта повара":"Linked chef email"}<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-[#d8c9bf] p-3" placeholder="chef@gmail.com"/></label>
    <label className="min-w-[220px] flex-1 text-sm font-semibold">{ru?"Новый пароль":"Temporary password"}<input required type="password" autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-[#d8c9bf] p-3" placeholder={ru?"Не менее 12 символов":"At least 12 characters"}/></label>
    <button type="submit" disabled={busy} className="rounded-lg bg-[#a32d27] px-5 py-3 font-semibold text-white disabled:opacity-50">{busy?"…":ru?"Сохранить пароль":"Set chef password"}</button>
   </form>
   {passwordError&&<p role="alert" className="mt-3 text-red-700">{passwordError}</p>}
   {passwordMessage&&<p role="status" className="mt-3 text-green-800">{passwordMessage}</p>}
  </div>
 </section>;
}
