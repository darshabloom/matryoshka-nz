"use client";
import {useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
type Dish={id:string;vendor_id:string|null;price_cents:number;approval_status:string;is_active:boolean;allergen_review_complete:boolean;menu_item_translations:{name:string;lang:string}[]};
type Vendor={id:string;display_name:string};
type Offer={menu_item_id:string;max_quantity:number|null;is_available:boolean};
export default function EventMenuManager({eventId,dishes,vendors,initialOffers,acceptedChefIds}:{eventId:string;dishes:Dish[];vendors:Vendor[];initialOffers:Offer[];acceptedChefIds:string[]}){
 const [offers,setOffers]=useState(initialOffers),[adding,setAdding]=useState(false),[selected,setSelected]=useState<string[]>([]),[query,setQuery]=useState(""),[chef,setChef]=useState("all"),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState(""),[caps,setCaps]=useState<Record<string,string>>({});
 const router=useRouter(),included=new Set(offers.map(x=>x.menu_item_id)),shown=adding?dishes.filter(d=>!included.has(d.id)):dishes.filter(d=>included.has(d.id));
 const filtered=shown.filter(d=>(chef==="all"||chef==="unassigned"&&!d.vendor_id||d.vendor_id===chef)&&[d.menu_item_translations?.[0]?.name,vendors.find(v=>v.id===d.vendor_id)?.display_name].join(" ").toLowerCase().includes(query.toLowerCase()));
 const name=(d:Dish)=>d.menu_item_translations?.find(t=>t.lang==="en")?.name||d.menu_item_translations?.[0]?.name||"Untitled dish";
 const vendor=(d:Dish)=>vendors.find(v=>v.id===d.vendor_id)?.display_name||"Unassigned · Matryoshka";
 const ready=(d:Dish)=>!!d.vendor_id&&d.approval_status==="approved"&&d.is_active&&d.allergen_review_complete&&acceptedChefIds.includes(d.vendor_id);
 async function change(action:"include"|"remove",ids:string[]){
  if(!ids.length)return;setBusy(true);setError("");setMessage("");
  try{const r=await fetch("/api/dishes/events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event_id:eventId,ids,action})});const x=await r.json();if(!r.ok)throw Error(x.error||"Could not update menu");
   setOffers(old=>action==="remove"?old.filter(o=>!ids.includes(o.menu_item_id)):[...old,...ids.filter(id=>!old.some(o=>o.menu_item_id===id)).map(id=>({menu_item_id:id,max_quantity:null,is_available:ready(dishes.find(d=>d.id===id)!)}))]);
   setSelected([]);setMessage(action==="include"?`${ids.length} dishes added to this event. Only approved and chef-accepted dishes can be sold.`:`${ids.length} dishes removed from event.`);router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Could not update dishes")}finally{setBusy(false)}
 }
 async function saveCapacity(id:string){
  setBusy(true);setError("");try{const value=caps[id]??String(offers.find(o=>o.menu_item_id===id)?.max_quantity??"");const capacity=value.trim()===""?null:Number(value);
   const r=await fetch("/api/admin/event-menu",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({eventId,dishId:id,capacity})});const x=await r.json();if(!r.ok)throw Error(x.error||"Could not save capacity");
   setOffers(old=>old.map(o=>o.menu_item_id===id?{...o,max_quantity:capacity}:o));setMessage("Event quantity limit saved.");router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Could not save quantity")}finally{setBusy(false)}
 }
 return <section style={{display:"grid",gap:19}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:13,flexWrap:"wrap"}}><div><h2 style={{font:"bold 29px Georgia,serif",margin:0}}>Event menu ({offers.length})</h2><p style={{color:"#76675c",fontSize:13}}>Add dishes from the reusable catalogue; edit products at their full detail pages.</p></div><button onClick={()=>{setAdding(v=>!v);setSelected([])}} style={{border:0,borderRadius:8,background:"#a32e28",color:"white",padding:"13px 19px",fontWeight:800,cursor:"pointer"}}>{adding?"← Back to included dishes":"＋ Add dishes from catalogue"}</button></div>
 {adding&&<p style={{background:"#f2e5d9",padding:15,borderRadius:9,fontSize:13,color:"#694c3d"}}>Select one or more dishes below, then click <strong>Include selected dishes</strong>. Unassigned drafts may be added to plan the menu, but cannot be sold until a participating chef accepts and the dish is approved.</p>}
 <div style={{display:"flex",gap:12,flexWrap:"wrap"}}><input type="search" aria-label="Search dishes" placeholder="Search dishes or chefs…" value={query} onChange={e=>setQuery(e.target.value)} style={{padding:13,borderRadius:8,border:"1px solid #dbc8b8",flex:2,minWidth:210}}/><select aria-label="Filter by chef" value={chef} onChange={e=>setChef(e.target.value)} style={{padding:13,borderRadius:8,border:"1px solid #dbc8b8",flex:1,minWidth:180}}><option value="all">All chefs</option><option value="unassigned">Unassigned</option>{vendors.map(v=><option key={v.id} value={v.id}>{v.display_name}</option>)}</select></div>
 {error&&<p role="alert" style={{color:"#ac2825"}}>{error}</p>}{message&&<p role="status" style={{color:"#267144"}}>{message}</p>}
 {filtered.length===0?<div style={{border:"1px dashed #d8bfac",borderRadius:10,padding:25,color:"#7b6b61"}}>{adding?"No other dishes found. Create a dish in Food, then return here.":"No dishes included yet. Use Add dishes from catalogue."}</div>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:15}}>{filtered.map(d=>{const offer=offers.find(x=>x.menu_item_id===d.id),isChecked=selected.includes(d.id);return <article key={d.id} onClick={()=>adding&&setSelected(old=>isChecked?old.filter(x=>x!==d.id):[...old,d.id])} style={{padding:20,background:isChecked?"#fff1e9":"white",border:isChecked?"2px solid #a32e28":"1px solid #e3d1c3",borderRadius:12,cursor:adding?"pointer":"default",display:"flex",flexDirection:"column",gap:10}}>
 <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><span style={{fontSize:11,fontWeight:800,color:ready(d)?"#287145":"#a26740"}}>{ready(d)?"✓ Ready for customers":"Needs preparation / approval"}</span>{adding&&<input type="checkbox" aria-label={`Select ${name(d)}`} checked={isChecked} onChange={()=>setSelected(old=>isChecked?old.filter(x=>x!==d.id):[...old,d.id])} onClick={e=>e.stopPropagation()}/>}</div>
 <strong style={{font:"bold 23px Georgia,serif"}}>{name(d)}</strong><span style={{fontSize:12,color:"#745e51"}}>{vendor(d)} · NZ$ {(d.price_cents/100).toFixed(2)}</span><span style={{fontSize:12,color:"#886e5e"}}>{d.approval_status.replaceAll("_"," ")}</span>
 <Link href={`/dishes/${d.id}`} onClick={e=>e.stopPropagation()} style={{fontSize:13,fontWeight:800,color:"#a32e28"}}>{d.vendor_id?"Open dish details →":"Assign chef / edit dish →"}</Link>
 {!adding&&offer&&<><div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><input aria-label={`Max quantity for ${name(d)}`} type="number" min={1} placeholder="Unlimited" value={caps[d.id]??String(offer.max_quantity??"")} onChange={e=>setCaps(old=>({...old,[d.id]:e.target.value}))} style={{padding:10,borderRadius:8,border:"1px solid #dec9ba",width:120}}/><button disabled={busy} onClick={()=>void saveCapacity(d.id)} style={{padding:10,background:"white",color:"#a32e28",border:"1px solid #c5a99b",borderRadius:8,cursor:"pointer"}}>Save limit</button></div><button disabled={busy} onClick={()=>void change("remove",[d.id])} style={{alignSelf:"start",background:"none",border:0,color:"#9d382e",textDecoration:"underline",cursor:"pointer"}}>Remove from event</button></>}
 </article>})}</div>}
 {adding&&<div style={{position:"sticky",bottom:12,padding:15,background:"#fff7f1",border:"1px solid #d9b9a6",borderRadius:10,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}><strong>{selected.length} selected</strong><button disabled={busy||!selected.length} onClick={()=>void change("include",selected)} style={{padding:"13px 19px",background:"#a32e28",color:"white",border:0,borderRadius:8,fontWeight:800,cursor:"pointer"}}>Include selected dishes →</button></div>}
 </section>;

}
