"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {useLanguage} from "@/components/i18n/LanguageProvider";
export default function AdminProfilePhoto({image}:{image:string|null}){
 const [photo,setPhoto]=useState(image??""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const router=useRouter(),{lang}=useLanguage(),ru=lang==="ru";
 async function upload(file:File){
  setBusy(true);setError("");
  const form=new FormData();form.set("file",file);
  try{
   const res=await fetch("/api/admin-profile-photo",{method:"POST",body:form});
   const data=await res.json();
   if(!res.ok||!data.url)throw Error(data.error||"Upload failed");
   setPhoto(data.url);router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Upload failed")}finally{setBusy(false)}
 }
 return <section style={{background:"white",border:"1px solid #ead9ca",borderRadius:13,padding:22,margin:"24px 0"}}>
 <h2 style={{font:"700 23px Georgia,serif",color:"#962a26",marginBottom:17}}>{ru?"Моё фото":"My photo"}</h2>
 <div style={{display:"flex",alignItems:"center",gap:21,flexWrap:"wrap"}}>
 {photo?<img src={photo} alt="Profile" style={{width:94,height:94,borderRadius:"50%",objectFit:"cover"}}/>:<span style={{width:94,height:94,borderRadius:"50%",background:"#eddccf",display:"grid",placeItems:"center"}}>✿</span>}
 <label style={{display:"grid",gap:10,fontWeight:700}}>{ru?"Загрузить фото":"Upload photo"}
 <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file)}}/>
 <small style={{fontWeight:400}}>{ru?"JPG, PNG, WebP · до 5 МБ":"JPG, PNG, WebP · 5MB maximum"}</small></label></div>
 {busy&&<p>{ru?"Загружаем…":"Uploading…"}</p>}{error&&<p role="alert" style={{color:"#a32d27"}}>{error}</p>}</section>;
}
