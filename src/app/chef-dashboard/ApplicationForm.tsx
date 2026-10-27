"use client";
import {useState} from "react";
import {useLanguage} from "@/components/i18n/LanguageProvider";
type Event={id:string;title_en:string;title_ru:string|null;starts_at:string;chef_application_deadline:string|null};
type App={id:string;event_id:string;status:string;review_note:string|null;events:{title_en:string;title_ru:string|null}|null};
export default function ApplicationForm({vendorId,availableEvents,initialApplications}:{vendorId:string;availableEvents:Event[];initialApplications:App[]}){
 const {lang}=useLanguage();const ru=lang==="ru";
 const [selected,setSelected]=useState(""),[message,setMessage]=useState(""),[fulfilment,setFulfilment]=useState("collection"),[busy,setBusy]=useState(false),[error,setError]=useState(""),[done,setDone]=useState(false);
 const active=availableEvents.filter(e=>!e.chef_application_deadline||new Date(e.chef_application_deadline)>new Date());
 const applied=new Map(initialApplications.map(a=>[a.event_id,a]));
 async function apply(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");
  const res=await fetch("/api/chef/applications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({vendor_id:vendorId,event_id:selected,message,fulfilment})});const data=await res.json();
  if(!res.ok)setError(data.error||"Unable to apply");else setDone(true);setBusy(false);
 }
 return <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:22,marginTop:30}}>
 <section style={{background:"white",padding:25,borderRadius:14,border:"1px solid #eadbcc"}}>
 <h2 style={{font:"bold 28px Georgia,serif"}}>{ru?"Подать заявку":"Apply to an event"}</h2>
 {done?<p role="status" style={{color:"#246d43"}}>{ru?"Заявка отправлена.":"Application submitted."}</p>:<form onSubmit={apply} style={{display:"grid",gap:16,marginTop:18}}>
 <label>{ru?"Событие":"Event"}<select required value={selected} onChange={e=>setSelected(e.target.value)} style={{display:"block",width:"100%",padding:12,marginTop:6}}><option value="">{ru?"Выберите событие":"Choose an event"}</option>{active.filter(e=>!applied.has(e.id)||["changes_requested","withdrawn"].includes(applied.get(e.id)!.status)).map(e=><option key={e.id} value={e.id}>{ru?(e.title_ru||e.title_en):e.title_en}</option>)}</select></label>
 <label>{ru?"Сообщение организатору (необязательно)":"Message to organiser (optional)"}<textarea rows={4} value={message} onChange={e=>setMessage(e.target.value)} style={{display:"block",width:"100%",padding:12,marginTop:6}}/></label>
 <label>{ru?"Как будет предоставлена еда":"Food preparation / service"}<select value={fulfilment} onChange={e=>setFulfilment(e.target.value)} style={{display:"block",width:"100%",padding:12,marginTop:6}}><option value="collection">Prepared for collection</option><option value="onsite">Prepared / served on site</option><option value="other">Other arrangements</option></select></label>
 {error&&<p role="alert" style={{color:"#b02424"}}>{error}</p>}
 <button disabled={busy||!selected} style={{background:"#a42b26",color:"white",border:0,padding:14,borderRadius:9,cursor:"pointer"}}>{ru?"Отправить заявку":"Submit application"}</button></form>}
 </section>
 <section style={{background:"white",padding:25,borderRadius:14,border:"1px solid #eadbcc"}}><h2 style={{font:"bold 28px Georgia,serif"}}>{ru?"Мои заявки":"My applications"}</h2>{initialApplications.length===0?<p style={{marginTop:20,color:"#827569"}}>{ru?"Заявок пока нет.":"No applications yet."}</p>:initialApplications.map(a=><div key={a.id} style={{padding:"16px 0",borderBottom:"1px solid #eadbcc"}}><strong>{ru?(a.events?.title_ru||a.events?.title_en):a.events?.title_en}</strong><p style={{color:"#a42b26",marginTop:7}}>{a.status.replace("_"," ")}</p>{a.review_note&&<p>{a.review_note}</p>}</div>)}</section>
 </div>;
}