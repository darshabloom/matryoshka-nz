"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {useLanguage} from "@/components/i18n/LanguageProvider";
export default function EventPhotos({eventId,initialCover,initialGallery}:{eventId:string;initialCover:string|null;initialGallery:string[]}){
 const {lang}=useLanguage(),ru=lang==="ru",t=(en:string,russian:string)=>ru?russian:en;
 const router=useRouter(),[cover,setCover]=useState(initialCover),[gallery,setGallery]=useState(initialGallery);
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 async function add(file:File,kind:"cover"|"gallery"){
  setBusy(true);setError("");
  try{
   const f=new FormData();f.set("eventId",eventId);f.set("kind",kind);f.set("file",file);
   const response=await fetch("/api/admin/events/photos",{method:"POST",body:f});
   const data=await response.json();if(!response.ok||!data.url)throw Error(data.error||"Upload failed");
   if(kind==="cover")setCover(data.url);else setGallery(prev=>[...prev,data.url]);
   router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Upload failed")}finally{setBusy(false)}
 }
 async function remove(url:string){
  setBusy(true);setError("");
  try{
   const response=await fetch("/api/admin/events/photos",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({eventId,url})});
   if(!response.ok)throw Error("Unable to remove image");
   setCover(c=>c===url?null:c);setGallery(prev=>prev.filter(x=>x!==url));router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Unable to remove image")}finally{setBusy(false)}
 }
 const upload=(kind:"cover"|"gallery",label:string)=><label style={{display:"inline-grid",gap:5,background:"#fff3ec",padding:"13px 18px",border:"1px dashed #bd7d66",borderRadius:9,color:"#9b362c",fontWeight:750,cursor:"pointer"}}>＋ {label}<input hidden type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{const file=e.currentTarget.files?.[0];if(file)void add(file,kind);e.currentTarget.value=""}}/></label>;
 return <section style={{background:"#fff",border:"1px solid #e4d0c1",borderRadius:14,padding:20,display:"grid",gap:14}}>
  <h2 style={{font:"700 25px Georgia,serif",color:"#922e29"}}>{t("Event photos","Фотографии события")}</h2>
  <p style={{fontSize:13,color:"#796256"}}>{t("The cover appears on event cards and at the top of the event page. Add up to six gallery photos.","Обложка отображается на карточках и вверху страницы события. Можно добавить до шести дополнительных фото.")}</p>
  {cover&&<div style={{position:"relative",maxWidth:560}}><img alt={t("Event cover","Обложка события")} src={cover} style={{width:"100%",aspectRatio:"16/9",objectFit:"cover",borderRadius:10}}/><button type="button" disabled={busy} onClick={()=>void remove(cover)} style={{position:"absolute",top:8,right:8,border:0,borderRadius:7,padding:"8px 11px",background:"#fff",color:"#8c2720",fontWeight:700}}>× {t("Remove","Удалить")}</button></div>}
  <div>{upload("cover",cover?t("Replace cover","Заменить обложку"):t("Upload cover","Загрузить обложку"))}</div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(115px,1fr))",gap:10}}>{gallery.map(url=><div key={url} style={{position:"relative"}}><img src={url} alt={t("Event gallery","Галерея")} style={{width:"100%",height:105,objectFit:"cover",borderRadius:8}}/><button type="button" disabled={busy} onClick={()=>void remove(url)} style={{position:"absolute",top:4,right:4,background:"#fff",border:0,borderRadius:6,color:"#a32d27",padding:"4px 7px"}}>×</button></div>)}</div>
  {gallery.length<6&&<div>{upload("gallery",t("Add gallery photo","Добавить фото"))}</div>}
  {busy&&<p>{t("Saving photo…","Сохраняем фото…")}</p>}{error&&<p role="alert" style={{color:"#a42d27"}}>{error}</p>}
 </section>;
}
