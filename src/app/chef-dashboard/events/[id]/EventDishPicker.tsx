"use client";
import {useState} from "react";
import Link from "next/link";
type Dish={id:string;price_cents:number;approval_status:string;menu_item_translations:{name:string;lang:string}[]};
export default function EventDishPicker({eventId,initialDishes,initialIncluded}:{eventId:string;initialDishes:Dish[];initialIncluded:string[]}){
 const [included,setIncluded]=useState(initialIncluded),[selected,setSelected]=useState<string[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [showAll,setShowAll]=useState(false);
 const shown=showAll?initialDishes:initialDishes.filter(d=>included.includes(d.id));
 const toggle=(id:string)=>setSelected(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
 async function update(action:"include"|"remove"){
  if(!selected.length)return;setBusy(true);setError("");setNotice("");
  try{const response=await fetch("/api/dishes/events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event_id:eventId,ids:selected,action})});const result=await response.json();if(!response.ok)throw Error(result.error||"Could not update event dishes");
  setIncluded(prev=>action==="include"?[...new Set([...prev,...selected])]:prev.filter(id=>!selected.includes(id)));
  setNotice(action==="include"?"Dishes included in the event. Unapproved dishes will not be sold until Marina approves them.":"Dishes removed from this event.");
  setSelected([]);if(action==="include")setShowAll(false);
  }catch(e){setError(e instanceof Error?e.message:"Unable to update event")}finally{setBusy(false)}
 }
 const control={borderRadius:9,padding:"12px 18px",border:"1px solid #cdb8ab",cursor:"pointer",fontWeight:750 as const};
 return <section style={{background:"white",padding:"clamp(18px,4vw,28px)",border:"1px solid #e7d8c9",borderRadius:15,marginTop:32}}>
 <div style={{display:"flex",justifyContent:"space-between",gap:18,alignItems:"center",flexWrap:"wrap",marginBottom:20}}><div><h2 style={{font:"bold 30px Georgia,serif",margin:"0 0 7px"}}>My event menu</h2><p style={{color:"#75685e",fontSize:14}}>{included.length} dishes included · {initialDishes.length} in your catalogue</p></div><button style={{...control,background:showAll?"white":"#a32b27",color:showAll?"#9c2b26":"white"}} onClick={()=>{setShowAll(x=>!x);setSelected([])}}>{showAll?"Done selecting":"＋ Add / manage dishes"}</button></div>
 {showAll&&<p style={{background:"#f9ede3",color:"#705445",padding:15,borderRadius:10,lineHeight:1.6,fontSize:13}}>Choose dishes below, then click <strong>Include selected dishes</strong>. An included dish still needs Marina's approval before it can be sold.</p>}
 {error&&<p role="alert" style={{color:"#ab2825"}}>{error}</p>}{notice&&<p role="status" style={{color:"#226c41"}}>{notice}</p>}
 <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:15,marginTop:21}}>
 {shown.map(d=>{const added=included.includes(d.id),checked=selected.includes(d.id);return <article key={d.id} style={{border:checked?"2px solid #a32b27":"1px solid #e7d5c8",background:checked?"#fff7f3":"white",borderRadius:11,padding:18,cursor:showAll?"pointer":"default"}} onClick={()=>showAll&&toggle(d.id)}>
 <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}><span style={{fontSize:11,color:added?"#24653e":"#896954",background:added?"#eaf4eb":"#f7ede3",padding:"6px 9px",borderRadius:20,fontWeight:750}}>{added?"✓ Included":"Not included"}</span>{showAll&&<input type="checkbox" aria-label="Select dish" checked={checked} onChange={()=>toggle(d.id)} onClick={e=>e.stopPropagation()} style={{accentColor:"#a32b27",width:23,height:23,cursor:"pointer"}}/>}</div>
 <div style={{display:"grid",placeItems:"center",height:76,color:"#b96d61",fontSize:43}}>✿</div><h3 style={{font:"bold 21px Georgia,serif",margin:"8px 0"}}>{d.menu_item_translations[0]?.name||"Untitled dish"}</h3><p style={{color:"#a32b27",fontWeight:750}}>NZ$ {(d.price_cents/100).toFixed(2)}</p><p style={{fontSize:12,color:"#78675a"}}>{d.approval_status==="approved"?"Approved for sale":"Awaiting approval / Draft"}</p><Link href={`/dishes/${d.id}`} onClick={e=>e.stopPropagation()} style={{color:"#96352d",fontWeight:700,fontSize:12}}>Edit dish →</Link></article>})}
 </div>
 {!shown.length&&<div style={{padding:"34px 12px",textAlign:"center",color:"#786b60"}}>{showAll?"Your catalogue is empty. Add your first dish in My Dishes.":"No dishes included yet. Click Add / manage dishes to select from your catalogue."}<div style={{marginTop:18}}><Link href="/chef-dashboard?tab=dishes" style={{color:"#a32b27",fontWeight:750}}>Open My Dishes →</Link></div></div>}
 {showAll&&<div style={{display:"flex",gap:11,flexWrap:"wrap",alignItems:"center",position:"sticky",bottom:12,marginTop:22,padding:17,borderRadius:12,background:"#fff8f3",border:"1px solid #e4cbbd",boxShadow:"0 8px 22px #36211718"}}><strong style={{marginRight:"auto"}}>{selected.length} selected</strong><button disabled={busy||!selected.length} style={{...control,background:"#a32b27",color:"white",opacity:(busy||selected.length===0)?0.5:1}} onClick={()=>void update("include")}>Include selected dishes</button><button disabled={busy||!selected.length} style={{...control,background:"white",color:"#a32b27"}} onClick={()=>void update("remove")}>Remove selected</button></div>}
 </section>;
}