"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {useLanguage} from "@/components/i18n/LanguageProvider";
export default function EventChefRemove({eventId,vendorId,chefName}:{eventId:string;vendorId:string;chefName:string}){
 const {lang}=useLanguage(),ru=lang==="ru",router=useRouter();
 const [confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function remove(){
  setBusy(true);setError("");
  try{
   const r=await fetch("/api/admin/events/remove-chef",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({eventId,vendorId})});
   const data=await r.json();if(!r.ok)throw Error(data.error||"Unable to remove chef");
   setConfirm(false);router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Unable to remove chef")}finally{setBusy(false)}
 }
 return <div style={{marginTop:16,borderTop:"1px solid #ecd8c9",paddingTop:12}}>
  {!confirm?<button type="button" onClick={()=>setConfirm(true)} style={{background:"transparent",border:"1px solid #b52c28",color:"#a32b27",borderRadius:7,padding:"9px 12px",fontWeight:700,cursor:"pointer"}}>{ru?"Удалить с мероприятия":"Remove from event"}</button>:
  <div role="group" aria-label={ru?"Подтверждение удаления":"Confirm removal"}>
   <p style={{fontSize:13,margin:"0 0 9px"}}>{ru?`Удалить ${chefName} с мероприятия? Его блюда перестанут быть доступны для новых заказов. Существующие заказы и профиль сохранятся.`:`Remove ${chefName} from this event? Their dishes will become unavailable for new orders. Existing orders and their chef profile will be preserved.`}</p>
   <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
    <button type="button" disabled={busy} onClick={()=>void remove()} style={{background:"#a32b27",color:"white",border:0,borderRadius:7,padding:"9px 12px",fontWeight:700,cursor:"pointer"}}>{busy?(ru?"Удаление…":"Removing…"):(ru?"Подтвердить удаление":"Confirm removal")}</button>
    <button type="button" disabled={busy} onClick={()=>{setConfirm(false);setError("")}} style={{background:"white",border:"1px solid #d7bcab",borderRadius:7,padding:"9px 12px",cursor:"pointer"}}>{ru?"Отмена":"Cancel"}</button>
   </div>
  </div>}
  {error&&<p role="alert" style={{color:"#a32b27",fontSize:13}}>{error}</p>}
 </div>;
}
