"use client";
import {useState,useRef,useEffect} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {createSupabaseBrowserClient} from "@/lib/supabase/client";
import {useLanguage} from "@/components/i18n/LanguageProvider";
export default function AccountAvatarMenu({email,dashboard,avatar}:{email:string;dashboard:string;avatar:string|null}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false);
 const wrap=useRef<HTMLDivElement>(null),router=useRouter(),{lang}=useLanguage(),ru=lang==="ru";
 useEffect(()=>{if(!open)return;const onPointer=(e:PointerEvent)=>{if(wrap.current&&!wrap.current.contains(e.target as Node))setOpen(false)};const onKey=(e:KeyboardEvent)=>{if(e.key==="Escape")setOpen(false)};document.addEventListener("pointerdown",onPointer);document.addEventListener("keydown",onKey);return()=>{document.removeEventListener("pointerdown",onPointer);document.removeEventListener("keydown",onKey)}},[open]);
 async function signOut(){setBusy(true);const {error}=await createSupabaseBrowserClient().auth.signOut();if(error){setBusy(false);return}router.replace("/");router.refresh()}
 return <div ref={wrap} style={{position:"relative"}}>
 <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label={ru?"Открыть меню профиля":"Open profile menu"} onClick={()=>setOpen(v=>!v)} style={{width:43,height:43,borderRadius:"50%",background:"#ead4c7",border:"2px solid #c99280",color:"#91302a",font:"700 20px Georgia,serif",cursor:"pointer",display:"grid",placeItems:"center"}}>{avatar?<img src={avatar} alt="" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%"}}/>:email.slice(0,1).toUpperCase()}</button>
 {open&&<div role="menu" style={{position:"absolute",right:0,top:"calc(100% + 12px)",background:"white",border:"1px solid #e6d9ce",borderRadius:12,boxShadow:"0 16px 40px #412a1e25",width:260,padding:9,zIndex:100}}>
 <div style={{padding:"12px 11px",borderBottom:"1px solid #eee2da",overflowWrap:"anywhere"}}><strong style={{fontSize:14}}>{ru?"Мой профиль":"My profile"}</strong><div style={{color:"#86756e",fontSize:12,marginTop:5}}>{email}</div></div>
 <Link role="menuitem" href={dashboard} onClick={()=>setOpen(false)} style={{display:"block",padding:"13px 11px",color:"#912e29",fontWeight:700,textDecoration:"none"}}>{ru?"Мой кабинет":"My dashboard"} →</Link>
 <Link role="menuitem" href="/account" onClick={()=>setOpen(false)} style={{display:"block",padding:"11px",color:"#4e3a31",textDecoration:"none"}}>{ru?"Покупки и аккаунт":"Shopping & account"}</Link>
 <button role="menuitem" type="button" disabled={busy} onClick={()=>void signOut()} style={{display:"block",width:"100%",textAlign:"left",padding:"12px 11px",border:0,borderTop:"1px solid #eee2da",background:"transparent",color:"#9a3029",fontWeight:700,cursor:"pointer"}}>{busy?"…":ru?"Выйти":"Sign out"}</button></div>}
 </div>;
}