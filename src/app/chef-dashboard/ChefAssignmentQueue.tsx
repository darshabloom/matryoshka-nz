"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
type Request={dish_id:string;vendor_id:string;dish_name:string;description:string;price_cents:number;ingredients_text:string;allergen_statement:string;cross_contact_statement:string;assigned_at:string};
export default function ChefAssignmentQueue({initial}:{initial:Request[]}){
 const [requests,setRequests]=useState(initial),[busy,setBusy]=useState<string|null>(null),[error,setError]=useState(""),[message,setMessage]=useState("");
 const router=useRouter();
 async function respond(dishId:string,accept:boolean){
  const note=accept?"":window.prompt("Tell Marina why you cannot accept this dish (optional):")??"";
  if(!accept&&note===null)return;
  setBusy(dishId);setError("");setMessage("");
  try{const response=await fetch("/api/chef/dish-assignments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({dishId,accept,note})});const result=await response.json();if(!response.ok)throw Error(result.error||"Could not respond");setRequests(old=>old.filter(x=>x.dish_id!==dishId));setMessage(accept?"Dish accepted! It is now in My Dishes as a draft. Review all details and submit for approval.":"Marina has received your response.");router.refresh();}
  catch(e){setError(e instanceof Error?e.message:"Unable to respond")}finally{setBusy(null)}
 }
 if(!requests.length)return null;
 return <section style={{margin:"22px 0 30px",padding:25,border:"1px solid #e1c9b6",borderRadius:14,background:"#fff8ef"}}><h2 style={{font:"bold 28px Georgia,serif",margin:"0 0 8px",color:"#902e28"}}>Dishes awaiting your acceptance ({requests.length})</h2><p style={{fontSize:13,color:"#775e4f",lineHeight:1.6}}>Marina has prepared these listings for your kitchen. Review ingredients, allergens, price and preparation before taking responsibility.</p>
 {requests.map(d=><article key={d.dish_id} style={{padding:"21px 0",borderBottom:"1px solid #e6d5c7"}}><h3 style={{font:"bold 22px Georgia,serif",margin:"0 0 10px"}}>{d.dish_name} · NZ$ {(d.price_cents/100).toFixed(2)}</h3><p style={{fontSize:13,color:"#705f55"}}>{d.description}</p><div style={{fontSize:13,lineHeight:1.65,background:"white",borderRadius:9,padding:15}}><strong>Ingredients</strong><p>{d.ingredients_text||"Not supplied yet — please ask Marina to complete this."}</p><strong>Allergens</strong><p>{d.allergen_statement||"Not supplied yet."}</p>{d.cross_contact_statement&&<><strong>Cross-contact risks</strong><p>{d.cross_contact_statement}</p></>}</div><div style={{display:"flex",gap:11,flexWrap:"wrap",marginTop:17}}><button disabled={!!busy} onClick={()=>void respond(d.dish_id,true)} style={{padding:"12px 19px",background:"#a32d27",color:"white",fontWeight:750,border:0,borderRadius:8,cursor:"pointer"}}>Accept and add to My Dishes</button><button disabled={!!busy} onClick={()=>void respond(d.dish_id,false)} style={{padding:"12px 19px",background:"white",color:"#a32d27",fontWeight:750,border:"1px solid #a32d27",borderRadius:8,cursor:"pointer"}}>Decline / Request changes</button></div></article>)}
 {error&&<p role="alert" style={{color:"#ad3027"}}>{error}</p>}{message&&<p role="status" style={{color:"#277341"}}>{message}</p>}</section>;
}
