"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
type E={id:string;slug:string;title_en:string;title_ru:string|null;description_en:string|null;description_ru:string|null;starts_at:string;ends_at:string;ordering_opens_at:string|null;ordering_closes_at:string|null;location_text:string|null;external_ticket_url:string|null;ticket_required:boolean;fulfilment_mode:string;chef_applications_open:boolean;chef_fulfilment_options:string[]};
const local=(s:string|null)=>s?new Date(new Date(s).getTime()-new Date(s).getTimezoneOffset()*60000).toISOString().slice(0,16):"";
export default function EventSettings({event}:{event:E}){
 const [form,setForm]=useState({...event,starts_at:local(event.starts_at),ends_at:local(event.ends_at),ordering_opens_at:local(event.ordering_opens_at),ordering_closes_at:local(event.ordering_closes_at)}),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const router=useRouter();
 async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");setNotice("");
  try{const data={...form,starts_at:new Date(form.starts_at).toISOString(),ends_at:new Date(form.ends_at).toISOString(),ordering_opens_at:form.ordering_opens_at?new Date(form.ordering_opens_at).toISOString():null,ordering_closes_at:form.ordering_closes_at?new Date(form.ordering_closes_at).toISOString():null};
   const r=await fetch("/api/admin/events",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});const x=await r.json();if(!r.ok)throw Error(x.error||"Could not save event");
   setNotice("Event settings saved.");router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Invalid dates or event details")}finally{setBusy(false)}
 }
 const field=(key:keyof E,label:string,type="text")=><label key={key} style={{display:"grid",gap:8,fontSize:13,fontWeight:750,color:"#5b4036"}}>{label}<input type={type} value={String(form[key]??"")} onChange={e=>setForm(o=>({...o,[key]:e.target.value}))} style={{padding:12,border:"1px solid #dac7b9",borderRadius:8}}/></label>;
 return <form onSubmit={save} style={{display:"grid",gap:18,background:"white",border:"1px solid #e3d1c3",borderRadius:13,padding:26}}>
 <h2 style={{font:"bold 29px Georgia,serif",margin:0}}>Event details & ordering settings</h2>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16}}>{field("title_en","Title (English)")}{field("title_ru","Title (Russian)")}{field("slug","URL name")}{field("location_text","Venue")}{field("external_ticket_url","Ticket booking URL","url")}</div>
 <label>Description (English)<textarea rows={3} value={form.description_en??""} onChange={e=>setForm(o=>({...o,description_en:e.target.value}))} style={{display:"block",width:"100%",padding:12,border:"1px solid #dac7b9",borderRadius:8}}/></label>
 <label>Description (Russian)<textarea rows={3} value={form.description_ru??""} onChange={e=>setForm(o=>({...o,description_ru:e.target.value}))} style={{display:"block",width:"100%",padding:12,border:"1px solid #dac7b9",borderRadius:8}}/></label>
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:16}}>{field("starts_at","Event starts","datetime-local")}{field("ends_at","Event ends","datetime-local")}{field("ordering_opens_at","Ordering opens","datetime-local")}{field("ordering_closes_at","Ordering closes","datetime-local")}</div>
 <p style={{fontSize:12,color:"#806e63"}}>Times use your device's timezone. Food ordering is activated separately in Overview when all readiness checks pass.</p>
 <label>Food provision<select value={form.fulfilment_mode} onChange={e=>setForm(o=>({...o,fulfilment_mode:e.target.value}))} style={{marginLeft:10,padding:12,border:"1px solid #dac7b9",borderRadius:8}}><option value="at_event">Provided at event</option><option value="collection">Collection</option><option value="delivery">Delivery</option></select></label>
 <label style={{display:"flex",alignItems:"center",gap:10}}><input type="checkbox" checked={form.ticket_required} onChange={e=>setForm(o=>({...o,ticket_required:e.target.checked}))}/> Valid event ticket required</label>
 <label style={{display:"flex",alignItems:"center",gap:10}}><input type="checkbox" checked={form.chef_applications_open} onChange={e=>setForm(o=>({...o,chef_applications_open:e.target.checked}))}/> Accept chef applications</label>
 {error&&<p role="alert" style={{color:"#a22b27"}}>{error}</p>}{notice&&<p role="status" style={{color:"#277443"}}>{notice}</p>}
 <button disabled={busy} style={{justifySelf:"start",background:"#a32d27",color:"#fff",border:0,padding:"13px 20px",borderRadius:8,fontWeight:800,cursor:"pointer"}}>{busy?"Saving…":"Save event settings"}</button></form>;
}