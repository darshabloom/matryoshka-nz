"use client";
import {useState} from "react";
import {createSupabaseBrowserClient} from "@/lib/supabase/client";
import {useLanguage} from "@/components/i18n/LanguageProvider";
export default function GoogleChefLink({vendorId}:{vendorId:string}){
 const {lang}=useLanguage(),ru=lang==="ru";
 const [email,setEmail]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[error,setError]=useState("");
 async function link(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError("");setMessage("");
  const db=createSupabaseBrowserClient();
  const {data,error:err}=await db.rpc("admin_link_vendor_google",{p_vendor_id:vendorId,p_email:email.trim()});
  if(err)setError(err.message);
  else if(data==="linked")setMessage(ru?"Google-аккаунт привязан. Повар может войти и увидеть свои блюда.":"Google account linked. The chef can now sign in and see their existing dishes.");
  else if(data==="already_linked")setMessage(ru?"Этот аккаунт уже привязан.":"This Google account is already linked.");
  else setError(ru?"Подтверждённый Google-аккаунт не найден. Сначала попросите повара войти через Google.":"Verified Google account not found. Ask the chef to sign in with Google first, then link it here.");
  setBusy(false);
 }
 return <section className="rounded-xl bg-white p-6 shadow-sm">
  <h2 className="mb-3 text-2xl font-bold">{ru?"Доступ через Google":"Google account access"}</h2>
  <p className="mb-4 text-sm text-[#796b62]">{ru?"Повар сначала должен войти через Google. Затем привяжите его адрес к существующему профилю — блюда и события сохранятся.":"Ask the chef to sign in with Google first. Then link their verified email to this existing chef profile. Dishes and event details stay attached."}</p>
  <form onSubmit={link} className="flex flex-wrap items-end gap-3">
   <label className="min-w-[220px] flex-1 text-sm font-semibold">{ru?"Адрес Google":"Google email address"}<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-[#d8c9bf] p-3" placeholder="chef@gmail.com"/></label>
   <button type="submit" disabled={busy} className="rounded-lg bg-[#a32d27] px-5 py-3 font-semibold text-white disabled:opacity-50">{busy?"…":ru?"Привязать Google":"Link Google account"}</button>
  </form>
  {error&&<p role="alert" className="mt-3 text-red-700">{error}</p>}
  {message&&<p role="status" className="mt-3 text-green-800">{message}</p>}
 </section>;
}
