"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {useLanguage} from "@/components/i18n/LanguageProvider";
type Chef={id:string;display_name:string};
export default function EventChefQuickAdd({eventId,chefs,approvedIds}:{eventId:string;chefs:Chef[];approvedIds:string[]}){
 const {lang}=useLanguage(),ru=lang==="ru";const router=useRouter();
 const [selected,setSelected]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const candidates=chefs.filter(c=>!approvedIds.includes(c.id));
 async function add(){
  if(!selected)return;setBusy(true);setError("");setNotice("");
  try{
   const r=await fetch("/api/admin/events/add-chef",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({eventId,vendorId:selected})});
   const x=await r.json();if(!r.ok)throw Error(x.error||"Could not add chef");
   setSelected("");setNotice(ru?"Повар добавлен к событию.":"Chef added to the event.");router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Unable to add chef")}finally{setBusy(false)}
 }
 return <div style={{background:"#fff9f2",border:"1px solid #e3c9b7",borderRadius:11,padding:16,margin:"14px 0 23px"}}>
  <strong style={{fontSize:17}}>{ru?"Добавить повара":"Add a chef"}</strong>
  <p style={{fontSize:12,color:"#80695a",margin:"5px 0 11px"}}>{ru?"Выберите повара — без заявки и дополнительного одобрения.":"Choose a chef directly; no application or separate approval is required."}</p>
  <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>
   <select aria-label={ru?"Выбрать повара":"Select chef"} value={selected} onChange={e=>setSelected(e.target.value)} style={{flex:"1 1 210px",padding:10,border:"1px solid #d7bcab",borderRadius:7,background:"#fff",color:"#2e241e"}}>
    <option value="">{ru?"Выберите повара":"Select chef"}</option>{candidates.map(c=><option key={c.id} value={c.id}>{c.display_name}</option>)}
   </select>
   <button type="button" disabled={!selected||busy} onClick={()=>void add()} style={{padding:"10px 18px",border:0,borderRadius:7,color:"#fff",background:"#a42d27",fontWeight:750,opacity:busy?.5:1}}>
    {busy?(ru?"Добавляем…":"Adding…"):(ru?"＋ Добавить":"＋ Add chef")}
   </button>
  </div>{candidates.length===0&&<p style={{fontSize:12,color:"#7b6558"}}>{ru?"Все повара уже добавлены.":"All chefs are already participating."}</p>}
  {notice&&<p role="status" style={{fontSize:12,color:"#276643"}}>{notice}</p>}
  {error&&<p role="alert" style={{fontSize:12,color:"#a32d27"}}>{error}</p>}
 </div>;
}
