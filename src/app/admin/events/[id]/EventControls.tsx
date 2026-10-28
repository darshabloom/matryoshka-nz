"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
type Check={key:string;label:string;ok:boolean;help:string};
export default function EventControls({eventId,published,orderingEnabled,publishReady,orderingReady,checks}:{eventId:string;published:boolean;orderingEnabled:boolean;publishReady:boolean;orderingReady:boolean;checks:Check[]}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");const router=useRouter();
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
 <p style={{fontSize:13,color:"#785c4f"}}>Event page: <strong>{published?"Published":"Draft"}</strong> · Food ordering: <strong>{orderingEnabled?"Enabled":"Closed"}</strong></p>
 {error&&<p role="alert" style={{color:"#ab2925"}}>{error}</p>}{notice&&<p role="status" style={{color:"#2a7046"}}>{notice}</p>}</section>;
}