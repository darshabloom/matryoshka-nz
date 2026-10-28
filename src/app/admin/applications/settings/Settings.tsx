"use client";
import {useState} from "react";
import {useLanguage} from "@/components/i18n/LanguageProvider";
type E={id:string;title_en:string;title_ru:string|null;is_published:boolean;chef_applications_open:boolean;chef_application_deadline:string|null};
export default function Settings({events}:{events:E[]}) {
 const {lang}=useLanguage();const ru=lang==="ru";
 const [items,setItems]=useState(events),[busy,setBusy]=useState(""),[error,setError]=useState("");
 async function toggle(e:E){setBusy(e.id);setError("");
  const res=await fetch("/api/admin/events",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:e.id,chef_applications_open:!e.chef_applications_open})});
  if(res.ok)setItems(old=>old.map(x=>x.id===e.id?{...x,chef_applications_open:!e.chef_applications_open}:x));
  else setError((await res.json()).error||"Update failed");setBusy("");
 }
 return <div style={{display:"grid",gap:15}}>{error&&<p role="alert" style={{color:"#a52626"}}>{error}</p>}
 {items.map(e=><div key={e.id} style={{background:"white",border:"1px solid #e5d9cc",borderRadius:13,padding:23,display:"flex",justifyContent:"space-between",alignItems:"center",gap:17,flexWrap:"wrap"}}>
 <div><h2 style={{font:"bold 25px Georgia,serif",marginBottom:8}}>{ru?(e.title_ru||e.title_en):e.title_en}</h2><p style={{color:"#73695f",fontSize:13}}>{e.is_published?"Published":"Draft"} · {e.chef_applications_open?"Applications open":"Applications closed"}</p></div>
 <button disabled={busy===e.id} onClick={()=>void toggle(e)} style={{padding:"12px 18px",borderRadius:9,cursor:"pointer",background:e.chef_applications_open?"white":"#a32b27",border:"1px solid #a32b27",color:e.chef_applications_open?"#a32b27":"white"}}>{e.chef_applications_open?(ru?"Закрыть заявки":"Close applications"):(ru?"Открыть заявки":"Open applications")}</button>
 </div>)}{items.length===0&&<p>No events found.</p>}</div>;
}