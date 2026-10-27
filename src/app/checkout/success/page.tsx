"use client";
import Link from "next/link";
import {useEffect,useState} from "react";

import {useBasket} from "@/components/cart/BasketProvider";
export default function PaymentReturn(){
 const {clear}=useBasket();const [session,setSession]=useState<string|null>(null);const [ready,setReady]=useState(false);
 const [status,setStatus]=useState<{paymentStatus:string;id:string;paidAt:string|null}|null>(null),[error,setError]=useState("");
 const [email,setEmail]=useState(""),[cancelText,setCancelText]=useState(""),[requesting,setRequesting]=useState(false);
 useEffect(()=>{setSession(new URLSearchParams(window.location.search).get("session_id"));setReady(true)},[]);
 useEffect(()=>{if(!ready)return;if(!session){setError("No payment session was supplied.");return}let active=true;let attempts=0;let timer:ReturnType<typeof setTimeout>;
  async function check(){try{const r=await fetch(`/api/checkout/session-status?session_id=${encodeURIComponent(session!)}`,{cache:"no-store"});const x=await r.json();if(!r.ok)throw Error(x.error??"Unable to confirm payment");if(!active)return;setStatus(x);if(x.paymentStatus==="paid"){clear();return}if(attempts++<8)timer=setTimeout(check,2500)}
  catch(e){if(active)setError(e instanceof Error?e.message:"Unable to check payment")}}
  void check();return ()=>{active=false;clearTimeout(timer)}
 },[session,ready]);
async function requestCancellation(){
  if(!session||!email.trim())return;setRequesting(true);setCancelText("");
  try{const r=await fetch("/api/orders/request-cancellation",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:session,email})});const x=await r.json();if(!r.ok)throw Error(x.error||"Unable to record request");setCancelText("Cancellation request received. Marina will review it; no refund has been issued yet.")}
  catch(e){setCancelText(e instanceof Error?e.message:"Please contact the event organiser")}finally{setRequesting(false)}
 }
 return <main style={{minHeight:"80vh",background:"#faf6ef",padding:"70px 18px"}}><section style={{maxWidth:650,margin:"auto",padding:"clamp(25px,5vw,52px)",borderRadius:15,border:"1px solid #e8d8c9",background:"white",textAlign:"center"}}><span style={{fontSize:50}}>✿</span><h1 style={{font:"bold 43px Georgia,serif",color:"#992e28"}}>{status?.paymentStatus==="paid"?"Your order is confirmed!":"Checking your payment"}</h1>{status?.paymentStatus==="paid"?<p>Stripe has confirmed payment. Your order reference is <strong>{status.id.slice(0,8).toUpperCase()}</strong>. Food will be provided at your event.</p>:<p>We are waiting for secure payment confirmation. Returning from Stripe does not by itself mean the payment succeeded. Please do not place another order until the status is known.</p>}{status?.paymentStatus==="paid"&&status.paidAt&&Date.now()-new Date(status.paidAt).getTime()<10*60*1000&&<div style={{margin:"20px 0",padding:18,background:"#faf1e7",borderRadius:10,textAlign:"left"}}><strong>Need to cancel?</strong><p>You may request cancellation within 10 minutes of payment. The request is reviewed by Marina; a refund is not automatic.</p><label style={{display:"grid",gap:7}}>Booking email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" style={{padding:12,border:"1px solid #dbc7b7",borderRadius:8}}/></label><button disabled={requesting||!email.trim()} onClick={()=>void requestCancellation()} style={{marginTop:12,padding:"12px 18px",border:"1px solid #a32b27",borderRadius:8,background:"white",color:"#a32b27",cursor:"pointer"}}>Request cancellation</button>{cancelText&&<p role="status">{cancelText}</p>}</div>}{error&&<p role="alert" style={{color:"#a32c26"}}>{error}</p>}<div style={{display:"flex",gap:13,justifyContent:"center",flexWrap:"wrap",marginTop:25}}><Link href="/account?tab=orders" style={{background:"#a32c27",borderRadius:9,padding:"13px 19px",color:"white",textDecoration:"none"}}>My Orders</Link><Link href="/events" style={{border:"1px solid #a32c27",borderRadius:9,padding:"13px 19px",color:"#a32c27",textDecoration:"none"}}>Explore events</Link></div></section></main>;
}