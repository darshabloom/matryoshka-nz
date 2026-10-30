"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {useLanguage} from "@/components/i18n/LanguageProvider";
type Check={key:string;label:string;ok:boolean;help:string};
export default function EventControls({eventId,published,orderingEnabled,publishReady,orderingReady,checks}:{eventId:string;published:boolean;orderingEnabled:boolean;publishReady:boolean;orderingReady:boolean;checks:Check[]}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");const router=useRouter();
 const {lang}=useLanguage(),ru=lang==="ru";
 const [linkChecking,setLinkChecking]=useState(false);
 const [linkResult,setLinkResult]=useState<null|{connected:boolean;negativeTestPassed:boolean;explanation?:string}>(null);
 async function testTicketLink(){
  setLinkChecking(true);setLinkResult(null);
  try{
   const response=await fetch("/api/admin/integrations/yumorilnik/health",{cache:"no-store"});
   const data=await response.json() as {connected?:boolean;negativeTestPassed?:boolean;explanation?:string};
   setLinkResult({connected:response.ok&&data.connected===true,
    negativeTestPassed:data.negativeTestPassed===true,explanation:data.explanation});
  }catch{setLinkResult({connected:false,negativeTestPassed:false})}
  finally{setLinkChecking(false)}
 }
 async function change(action:"publish"|"unpublish"|"open_ordering"|"close_ordering"){
  if(["open_ordering","unpublish"].includes(action)&&!window.confirm(action==="open_ordering"?"Enable actual food ordering for this event? Only proceed after payment testing.":"Unpublish this event and close food orders?"))return;
  setBusy(true);setError("");setNotice("");
  try{const r=await fetch("/api/admin/event-controls",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({eventId,action})});const x=await r.json();if(!r.ok)throw Error(x.error||"Action blocked");setNotice("Event status updated.");router.refresh()}
  catch(e){setError(e instanceof Error?e.message:"Could not update event")}finally{setBusy(false)}
 }
 return <section style={{padding:26,background:"white",border:"1px solid #e6d8cb",borderRadius:14,display:"grid",gap:16}}>
 <h2 style={{font:"bold 29px Georgia,serif",margin:0}}>Launch readiness</h2><p style={{fontSize:13,color:"#77665d",lineHeight:1.6}}>Publishing the event page and opening food ordering are separate decisions. Food ordering can only open when every required check passes.</p>
 <div style={{display:"grid",gap:11}}>{checks.map(c=><div key={c.key} style={{display:"flex",gap:13,padding:"13px 0",borderBottom:"1px solid #f0e4da"}}><span style={{color:c.ok?"#277041":"#ae593f",fontWeight:800,fontSize:19}}>{c.ok?"✓":"○"}</span><div><strong>{c.label}</strong>{!c.ok&&<p style={{fontSize:12,color:"#966653",lineHeight:1.5,margin:"5px 0 0"}}>{c.help}</p>}</div></div>)}</div>
 <div style={{display:"flex",gap:12,flexWrap:"wrap",paddingTop:9}}>{!published?<button disabled={busy||!publishReady} onClick={()=>void change("publish")} style={{padding:"13px 19px",border:0,borderRadius:8,background:"#a32b27",color:"white",fontWeight:800}}>Publish event page</button>:<button disabled={busy} onClick={()=>void change("unpublish")} style={{padding:"13px 19px",border:"1px solid #ab5a45",borderRadius:8,background:"white",color:"#9a2d27",fontWeight:800}}>Unpublish event</button>}
 {published&&(!orderingEnabled?<button disabled={busy||!orderingReady} onClick={()=>void change("open_ordering")} style={{padding:"13px 19px",border:0,borderRadius:8,background:"#a32b27",color:"white",fontWeight:800,opacity:orderingReady?1:.5}}>Open food ordering</button>:<button disabled={busy} onClick={()=>void change("close_ordering")} style={{padding:"13px 19px",border:"1px solid #a32b27",borderRadius:8,background:"white",color:"#a32b27",fontWeight:800}}>Close food ordering</button>)}</div>
 {eventId==="3b7d5371-926e-408b-a4b7-af69f27b42cf"&&
  <div style={{padding:"18px 20px",border:"1px solid #e1c9ba",background:"#fff9f2",borderRadius:11,display:"grid",gap:9}}>
   <strong>{ru?"Связь с билетами Юморильника":"Yumorilnik ticket connection"}</strong>
   <p style={{fontSize:13,color:"#67584c"}}>{ru?"Проверяем защищённую связь и отклонение несуществующего билета. Реальная покупка ещё не проверена.":"Checks the secure link and rejection of a nonexistent ticket. A real paid ticket still needs testing."}</p>
   <div><button type="button" disabled={linkChecking} onClick={()=>void testTicketLink()} style={{padding:"11px 16px",background:"#a32b27",color:"#fff",border:0,borderRadius:8,fontWeight:750,cursor:"pointer"}}>
    {linkChecking?(ru?"Проверяем…":"Checking…"):(ru?"Проверить связь":"Test connection")}
   </button></div>
   {linkResult&&<p role="status" style={{fontSize:13,color:linkResult.connected&&linkResult.negativeTestPassed?"#23653d":"#ac3128",fontWeight:700}}>
    {linkResult.connected&&linkResult.negativeTestPassed?(ru?"Связь работает; несуществующий билет отклонён.":"Connected; fake ticket correctly rejected."):(ru?"Связь не подтверждена. Проверьте настройки.":"Connection was not confirmed. Check configuration.")}
   </p>}
  </div>}
 <p style={{fontSize:13,color:"#785c4f"}}>Event page: <strong>{published?"Published":"Draft"}</strong> · Food ordering: <strong>{orderingEnabled?"Enabled":"Closed"}</strong></p>
 {error&&<p role="alert" style={{color:"#ab2925"}}>{error}</p>}{notice&&<p role="status" style={{color:"#2a7046"}}>{notice}</p>}</section>;
}