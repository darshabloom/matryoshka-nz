"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
type Vendor={id:string;display_name:string};
type Assignment={vendor_id:string;status:string;chef_note:string|null}|null;
export default function AssignmentControl({dishId,vendors,assignment}:{dishId:string;vendors:Vendor[];assignment:Assignment}){
 const [selected,setSelected]=useState(assignment?.vendor_id||""),[status,setStatus]=useState(assignment?.status||"unassigned"),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const router=useRouter();
 async function send(){
  setError("");setBusy(true);try{
   const r=await fetch("/api/admin/dish-assignments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({dishId,vendorId:selected})});
   const x=await r.json();if(!r.ok)throw Error(x.error||"Unable to assign");
   setStatus("pending");setNotice("Assignment request sent. The chef must accept it before the dish belongs to their kitchen.");router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Unable to assign")}finally{setBusy(false)}
 }
 return <section style={{border:"1px solid #dcc4b7",borderRadius:12,padding:20,background:"#fff7ee",marginBottom:20}}>
  <h2 style={{font:"bold 22px Georgia,serif",margin:"0 0 7px"}}>Assign this dish to a chef</h2>
  <p style={{fontSize:13,color:"#725d50",lineHeight:1.6}}>{status==="pending"?"Waiting for the chef to review and accept. You can choose a different chef to replace the request.":status==="declined"?"The chef declined. Review their note and send another request.":"This dish belongs to Matryoshka until a chef accepts responsibility for it."}</p>
  {assignment?.chef_note&&<p style={{fontSize:13,color:"#9a4036"}}>Chef feedback: {assignment.chef_note}</p>}
  <div style={{display:"flex",gap:11,alignItems:"center",flexWrap:"wrap"}}>
   <select aria-label="Select a chef" value={selected} onChange={e=>setSelected(e.target.value)} style={{padding:12,border:"1px solid #d3bdae",borderRadius:8,minWidth:220,flex:1}}><option value="">Choose a registered chef…</option>{vendors.map(v=><option key={v.id} value={v.id}>{v.display_name}</option>)}</select>
   <button type="button" disabled={!selected||busy} onClick={()=>void send()} style={{background:"#a32e28",color:"white",padding:"13px 20px",border:0,borderRadius:8,fontWeight:800,cursor:"pointer"}}>{busy?"Sending…":status==="pending"?"Update assignment":"Send assignment request"}</button>
  </div>
  {notice&&<p role="status" style={{color:"#287044"}}>{notice}</p>}{error&&<p role="alert" style={{color:"#a32828"}}>{error}</p>}
 </section>;
}