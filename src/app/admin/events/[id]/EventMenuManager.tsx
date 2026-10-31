"use client";
import {dishReadinessIssues,dishReadyForEvent} from "@/lib/menu-readiness";
import {customerPriceCents} from "@/lib/customer-pricing";
import {useState} from "react";
import {useSearchParams} from "next/navigation";
import Link from "next/link";
import {useRouter} from "next/navigation";
type Dish={id:string;vendor_id:string|null;price_cents:number;approval_status:string;is_active:boolean;allergen_review_complete:boolean;ingredients_text:string|null;allergen_statement:string|null;menu_item_translations:{name:string;lang:string}[];menu_item_images?:{image_url:string;sort_order:number|null;position_x:number;position_y:number;zoom_percent:number;crop_mode:string}[]};
type Vendor={id:string;display_name:string};
type Offer={menu_item_id:string;max_quantity:number|null;is_available:boolean};
export default function EventMenuManager({eventId,dishes,vendors,initialOffers,acceptedChefIds}:{eventId:string;dishes:Dish[];vendors:Vendor[];initialOffers:Offer[];acceptedChefIds:string[]}){
 const chefFilter=useSearchParams().get("chef");
 const [offers,setOffers]=useState(initialOffers),[adding,setAdding]=useState(false),[selected,setSelected]=useState<string[]>([]),[query,setQuery]=useState(""),[chef,setChef]=useState(()=>chefFilter&&vendors.some(v=>v.id===chefFilter)?chefFilter:"all"),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState(""),[caps,setCaps]=useState<Record<string,string>>({});
 const router=useRouter(),included=new Set(offers.map(x=>x.menu_item_id)),shown=adding?dishes.filter(d=>!included.has(d.id)):dishes.filter(d=>included.has(d.id));
 const filtered=shown.filter(d=>(chef==="all"||chef==="unassigned"&&!d.vendor_id||d.vendor_id===chef)&&[d.menu_item_translations?.[0]?.name,vendors.find(v=>v.id===d.vendor_id)?.display_name].join(" ").toLowerCase().includes(query.toLowerCase()));
 const name=(d:Dish)=>d.menu_item_translations?.find(t=>t.lang==="en")?.name||d.menu_item_translations?.[0]?.name||"Untitled dish";
 const vendor=(d:Dish)=>vendors.find(v=>v.id===d.vendor_id)?.display_name||"Unassigned · Matryoshka";
 const ready=(d:Dish)=>dishReadyForEvent(d,acceptedChefIds);
 async function change(action:"include"|"remove",ids:string[]){
  if(!ids.length)return;setBusy(true);setError("");setMessage("");
  try{const r=await fetch("/api/dishes/events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event_id:eventId,ids,action})});const x=await r.json();if(!r.ok)throw Error(x.error||"Could not update menu");
   setOffers(old=>action==="remove"?old.filter(o=>!ids.includes(o.menu_item_id)):[...old,...ids.filter(id=>!old.some(o=>o.menu_item_id===id)).map(id=>({menu_item_id:id,max_quantity:null,is_available:true}))]);
   setSelected([]);setMessage(action==="include"?`${ids.length} dishes added. Incomplete food information remains blocked at checkout.`:`${ids.length} dishes removed from event.`);router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Could not update dishes")}finally{setBusy(false)}
 }
 async function changeAvailability(d:Dish,isAvailable:boolean){
  if(!isAvailable&&!window.confirm("Pause this dish for the event? Existing paid orders remain unchanged."))return;
  setBusy(true);setError("");setMessage("");
  try{
   const response=await fetch("/api/admin/event-menu",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({eventId,dishId:d.id,isAvailable})});
   const result=await response.json() as {error?:string;issues?:string[]};
   if(!response.ok)throw Error([result.error,...(result.issues??[])].filter(Boolean).join(". ")||"Could not update dish availability");
   setOffers(old=>old.map(o=>o.menu_item_id===d.id?{...o,is_available:isAvailable}:o));
   setMessage(isAvailable?"Dish is visible on the event page.":"Dish hidden from the event page. Existing paid orders are unaffected.");
   router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Could not update dish availability");}
  finally{setBusy(false)}
 }
 async function saveCapacity(id:string){
  setBusy(true);setError("");try{const value=caps[id]??String(offers.find(o=>o.menu_item_id===id)?.max_quantity??"");const capacity=value.trim()===""?null:Number(value);
   const r=await fetch("/api/admin/event-menu",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({eventId,dishId:id,capacity})});const x=await r.json();if(!r.ok)throw Error(x.error||"Could not save capacity");
   setOffers(old=>old.map(o=>o.menu_item_id===id?{...o,max_quantity:capacity}:o));setMessage("Event quantity limit saved.");router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Could not save quantity")}finally{setBusy(false)}
 }
 return <section style={{display:"grid",gap:19}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:13,flexWrap:"wrap"}}><div><h2 style={{font:"bold 29px Georgia,serif",margin:0}}>Event dishes ({offers.length})</h2><p style={{color:"#76675c",fontSize:13}}>Add any dish directly. Visible/hidden controls the event page; checkout still protects food safety.</p></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Link href={`/dishes/new?event=${eventId}`} style={{background:"#fff7f0",padding:"12px 15px",color:"#923127",fontWeight:750,border:"1px solid #c69c88",borderRadius:8}}>＋ New dish</Link><button onClick={()=>{setAdding(v=>!v);setSelected([])}} style={{border:0,borderRadius:8,background:"#a32e28",color:"white",padding:"13px 19px",fontWeight:800,cursor:"pointer"}}>{adding?"← Back to included dishes":"＋ Add existing dishes"}</button></div></div>
 {adding&&<p style={{background:"#f2e5d9",padding:15,borderRadius:9,fontSize:13,color:"#694c3d"}}>Select dishes and click Include. They will appear immediately; chef assignment and any finishing details can be added afterwards.</p>}
 <div style={{display:"flex",gap:12,flexWrap:"wrap"}}><input type="search" aria-label="Search dishes" placeholder="Search dishes or chefs…" value={query} onChange={e=>setQuery(e.target.value)} style={{padding:13,borderRadius:8,border:"1px solid #dbc8b8",flex:2,minWidth:210}}/><select aria-label="Filter by chef" value={chef} onChange={e=>setChef(e.target.value)} style={{padding:13,borderRadius:8,border:"1px solid #dbc8b8",flex:1,minWidth:180}}><option value="all">All chefs</option><option value="unassigned">Unassigned</option>{vendors.map(v=><option key={v.id} value={v.id}>{v.display_name}</option>)}</select></div>
 {error&&<p role="alert" style={{color:"#ac2825"}}>{error}</p>}{message&&<p role="status" style={{color:"#267144"}}>{message}</p>}
 {filtered.length===0?<div style={{border:"1px dashed #d8bfac",borderRadius:10,padding:25,color:"#7b6b61"}}>{adding?"No other dishes found. Create a dish in Food, then return here.":"No dishes included yet. Use Add dishes from catalogue."}</div>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:15}}>{filtered.map(d=>{const offer=offers.find(x=>x.menu_item_id===d.id),isChecked=selected.includes(d.id);return <article key={d.id} onClick={()=>adding&&setSelected(old=>isChecked?old.filter(x=>x!==d.id):[...old,d.id])} style={{padding:20,background:isChecked?"#fff1e9":"white",border:isChecked?"2px solid #a32e28":"1px solid #e3d1c3",borderRadius:12,cursor:adding?"pointer":"default",display:"flex",flexDirection:"column",gap:10}}>
 {d.menu_item_images?.length ? <div style={{display:"grid",gridTemplateColumns:d.menu_item_images.length>1?"repeat(2,minmax(0,1fr))":"1fr",gap:5,overflow:"hidden",borderRadius:9,marginBottom:3}}>
  {[...d.menu_item_images].sort((a,b)=>(a.sort_order??0)-(b.sort_order??0)).map((photo,index)=><a key={photo.image_url} href={photo.image_url} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} aria-label={`View photo ${index+1} of ${name(d)}`} style={{display:"block",overflow:"hidden",borderRadius:6,background:"#f4ebe3"}}>
   <img src={photo.image_url} alt={`${name(d)} — photo ${index+1}`} loading="lazy" style={{width:"100%",height:d.menu_item_images!.length>1?115:165,objectFit:photo.crop_mode==="contain"?"contain":"cover",objectPosition:`${photo.position_x??50}% ${photo.position_y??50}%`,transform:`scale(${(photo.zoom_percent??100)/100})`,transformOrigin:`${photo.position_x??50}% ${photo.position_y??50}%`,display:"block"}}/>
  </a>)}
 </div> : <div style={{height:105,borderRadius:9,background:"#f7f0eb",display:"grid",placeItems:"center",color:"#826f62",fontSize:12}}>No dish photos yet</div>}
 <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><span style={{fontSize:11,fontWeight:800,color:ready(d)?"#287145":"#a26740"}}>{ready(d)?offer?.is_available?"✓ Visible":"Hidden":"Listed · Finish food details"}</span>{adding&&<input type="checkbox" aria-label={`Select ${name(d)}`} checked={isChecked} onChange={()=>setSelected(old=>isChecked?old.filter(x=>x!==d.id):[...old,d.id])} onClick={e=>e.stopPropagation()}/>}</div>
 <strong style={{font:"bold 23px Georgia,serif"}}>{name(d)}</strong><span style={{fontSize:12,color:"#745e51"}}>{vendor(d)} · Chef NZ$ {(d.price_cents/100).toFixed(2)} · Customer NZ$ {(customerPriceCents(d.price_cents)/100).toFixed(2)}</span><span style={{fontSize:12,color:"#886e5e"}}>{d.approval_status.replaceAll("_"," ")}</span>
 {dishReadinessIssues(d,acceptedChefIds).length>0&&<ul style={{margin:"4px 0",paddingLeft:19,fontSize:12,lineHeight:1.6,color:"#8b412e"}}>{dishReadinessIssues(d,acceptedChefIds).map(issue=><li key={issue}>{issue}</li>)}</ul>}
 <Link href={`/dishes/${d.id}?event=${eventId}`} onClick={e=>e.stopPropagation()} style={{fontSize:13,fontWeight:800,color:"#a32e28"}}>{"Edit dish →"}</Link>
 {!adding&&offer&&<>
 <button disabled={busy} onClick={()=>void changeAvailability(d,!offer.is_available)} style={{padding:"11px 13px",border:"1px solid #b69c88",borderRadius:8,background:offer.is_available?"white":"#a32e28",color:offer.is_available?"#a32e28":"white",fontWeight:800}}>
  {offer.is_available?"Hide dish":"Show dish"}
 </button>
 <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><input aria-label={`Max quantity for ${name(d)}`} type="number" min={1} placeholder="Unlimited" value={caps[d.id]??String(offer.max_quantity??"")} onChange={e=>setCaps(old=>({...old,[d.id]:e.target.value}))} style={{padding:10,borderRadius:8,border:"1px solid #dec9ba",width:120}}/><button disabled={busy} onClick={()=>void saveCapacity(d.id)} style={{padding:10,background:"white",color:"#a32e28",border:"1px solid #c5a99b",borderRadius:8,cursor:"pointer"}}>Save limit</button></div><button disabled={busy} onClick={()=>void change("remove",[d.id])} style={{alignSelf:"start",background:"none",border:0,color:"#9d382e",textDecoration:"underline",cursor:"pointer"}}>Remove from event</button></>}
 </article>})}</div>}
 {adding&&<div style={{position:"sticky",bottom:12,padding:15,background:"#fff7f1",border:"1px solid #d9b9a6",borderRadius:10,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}><strong>{selected.length} selected</strong><button disabled={busy||!selected.length} onClick={()=>void change("include",selected)} style={{padding:"13px 19px",background:"#a32e28",color:"white",border:0,borderRadius:8,fontWeight:800,cursor:"pointer"}}>Include selected dishes →</button></div>}
 </section>;

}
