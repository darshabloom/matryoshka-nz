"use client";
import {useState} from "react";
import {useLanguage} from "@/components/i18n/LanguageProvider";
type Application={id:string;status:string;message:string|null;fulfilment:string|null;review_note:string|null;events:{title_en:string;title_ru:string|null}|null;vendors:{display_name:string}|null};
export default function ReviewBoard({initial}:{initial:Application[]}){
 const {lang}=useLanguage(),ru=lang==="ru";
 const [rows,setRows]=useState(initial),[notes,setNotes]=useState<Record<string,string>>({}),[busy,setBusy]=useState(""),[error,setError]=useState("");
 async function review(id:string,status:string){setBusy(id);setError("");try{
  const res=await fetch("/api/admin/applications",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status,note:notes[id]??""})});
  const data=await res.json();if(!res.ok)throw Error(data.error||"Review failed");
  setRows(old=>old.map(x=>x.id===id?{...x,status}:x));
 }catch(e){setError(e instanceof Error?e.message:"Review failed")}finally{setBusy("")}}
 return <div style={{display:"grid",gap:16,marginTop:30}}>
  {error&&<p role="alert" style={{color:"#a42828"}}>{error}</p>}
  {rows.length===0&&<p>{ru?"Пока нет заявок":"No applications yet."}</p>}
  {rows.map(a=><article key={a.id} style={{background:"white",padding:24,border:"1px solid #e5d8cc",borderRadius:13,boxShadow:"0 5px 18px #30190808"}}>
   <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><div><h2 style={{font:"bold 26px Georgia,serif",margin:0}}>{a.vendors?.display_name??"Chef"}</h2><p>{ru?(a.events?.title_ru||a.events?.title_en):a.events?.title_en}</p></div><strong style={{color:"#9d3026"}}>{a.status.replace("_"," ")}</strong></div>
   <p style={{color:"#665c53",margin:"12px 0"}}>{a.message||"No message"} · {a.fulfilment}</p>
   {a.status==="pending"&&<><label style={{display:"block",marginTop:15}}>Review note / Комментарий<textarea value={notes[a.id]??""} onChange={e=>setNotes(o=>({...o,[a.id]:e.target.value}))} rows={2} style={{display:"block",width:"100%",padding:12,marginTop:8,border:"1px solid #d5c4b9",borderRadius:8}}/></label><div style={{display:"flex",gap:9,flexWrap:"wrap",marginTop:16}}>{[["approved",ru?"Одобрить":"Approve"],["changes_requested",ru?"Запросить изменения":"Request changes"],["rejected",ru?"Отклонить":"Decline"]].map(([state,label])=><button key={state} disabled={busy===a.id} onClick={()=>void review(a.id,state)} style={{padding:"11px 16px",borderRadius:8,background:state==="approved"?"#a42b26":"white",border:"1px solid #c9b3a7",color:state==="approved"?"white":"#912b26",cursor:"pointer"}}>{label}</button>)}</div></>}
   {a.review_note&&<p style={{marginTop:12,color:"#725e51"}}>Review: {a.review_note}</p>}
  </article>)}
 </div>;
}