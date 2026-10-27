"use client";
import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/i18n/LanguageProvider";

export default function SignInPage() {
 const { lang }=useLanguage(); const ru=lang==="ru";
 const [email,setEmail]=useState("");const [password,setPassword]=useState("");
 const [mode,setMode]=useState<"login"|"register">("login");const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [error,setError]=useState("");
 const supabase=createSupabaseBrowserClient();
 const redirectTo=typeof window==="undefined"?"":window.location.origin+"/auth/callback";
 async function google(){setBusy(true);setError("");const {error}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo}});if(error){setError(error.message);setBusy(false);}}
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");setMessage("");
  const result=mode==="register"
   ? await supabase.auth.signUp({email,password,options:{emailRedirectTo:redirectTo}})
   : await supabase.auth.signInWithPassword({email,password});
  if(result.error){setError(result.error.message);} else if(mode==="register"&&!result.data.session){setMessage(ru?"Проверьте почту для подтверждения регистрации.":"Check your email to confirm registration.");}
  else{window.location.assign("/account");return;}
  setBusy(false);
 }
 return <main style={{maxWidth:470,margin:"55px auto",padding:"0 20px 60px"}}>
  <h1 style={{font:"bold 42px Georgia,serif",color:"#952c28",marginBottom:12}}>{ru?"Вход в Матрёшку":"Welcome to Matryoshka"}</h1>
  <p style={{color:"#6a6159",marginBottom:26}}>{ru?"Для покупателей, поваров и администратора.":"For customers, chefs and administrators."}</p>
  <button onClick={google} disabled={busy} style={{width:"100%",padding:15,borderRadius:9,border:"1px solid #cbbdb3",background:"white",cursor:"pointer",fontWeight:700}}>{ru?"Продолжить с Google":"Continue with Google"}</button>
  <p style={{textAlign:"center",margin:"20px 0",color:"#777"}}>{ru?"или по электронной почте":"or use email"}</p>
  <form onSubmit={submit} style={{display:"grid",gap:13}}>
   <label>{ru?"Эл. почта":"Email"}<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} style={{width:"100%",padding:13,marginTop:5,border:"1px solid #ccbeb5",borderRadius:8}} /></label>
   <label>{ru?"Пароль":"Password"}<input required minLength={6} type="password" autoComplete={mode==="login"?"current-password":"new-password"} value={password} onChange={e=>setPassword(e.target.value)} style={{width:"100%",padding:13,marginTop:5,border:"1px solid #ccbeb5",borderRadius:8}} /></label>
   <button disabled={busy} style={{border:0,borderRadius:25,padding:15,background:"#a52625",color:"white",fontWeight:700,cursor:"pointer"}}>{mode==="login"?(ru?"Войти":"Sign in"):(ru?"Создать аккаунт":"Create account")}</button>
  </form>
  {error&&<p role="alert" style={{color:"#a52020",marginTop:15}}>{error}</p>}
  {message&&<p role="status" style={{marginTop:15}}>{message}</p>}
  <p style={{marginTop:20,textAlign:"center"}}><button type="button" onClick={()=>{setMode(mode==="login"?"register":"login");setError("");setMessage("");}} style={{border:0,background:"transparent",color:"#a52625",cursor:"pointer",textDecoration:"underline"}}>{mode==="login"?(ru?"Создать аккаунт":"Create an account"):(ru?"Уже есть аккаунт? Войти":"Have an account? Sign in")}</button></p>
  <p style={{fontSize:13,color:"#776d65",marginTop:25}}>{ru?"Вы также сможете оформить заказ без регистрации, когда заказы откроются.":"Guest checkout will also be available when ordering opens."} <Link href="/">{ru?"На главную":"Back home"}</Link></p>
 </main>
}