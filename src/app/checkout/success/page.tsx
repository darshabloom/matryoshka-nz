"use client";
import Link from "next/link";
import {useEffect,useState} from "react";

import {useBasket} from "@/components/cart/BasketProvider";
export default function PaymentReturn(){
 const {clear}=useBasket();const [session,setSession]=useState<string|null>(null);const [ready,setReady]=useState(false);
 const [status,setStatus]=useState<{paymentStatus:string;id:string}|null>(null),[error,setError]=useState("");
 useEffect(()=>{setSession(new URLSearchParams(window.location.search).get("session_id"));setReady(true)},[]);
 useEffect(()=>{if(!ready)return;if(!session){setError("No payment session was supplied.");return}let active=true;let attempts=0;let timer:ReturnType<typeof setTimeout>;
  async function check(){try{const r=await fetch(`/api/checkout/session-status?session_id=${encodeURIComponent(session!)}`,{cache:"no-store"});const x=await r.json();if(!r.ok)throw Error(x.error??"Unable to confirm payment");if(!active)return;setStatus(x);if(x.paymentStatus==="paid"){clear();return}if(attempts++<8)timer=setTimeout(check,2500)}
  catch(e){if(active)setError(e instanceof Error?e.message:"Unable to check payment")}}
  void check();return ()=>{active=false;clearTimeout(timer)}
 },[session,ready]);
 return <main style={{minHeight:"80vh",background:"#faf6ef",padding:"70px 18px"}}><section style={{maxWidth:650,margin:"auto",padding:"clamp(25px,5vw,52px)",borderRadius:15,border:"1px solid #e8d8c9",background:"white",textAlign:"center"}}><span style={{fontSize:50}}>✿</span><h1 style={{font:"bold 43px Georgia,serif",color:"#992e28"}}>{status?.paymentStatus==="paid"?"Your order is confirmed!":"Checking your payment"}</h1>{status?.paymentStatus==="paid"?<p>Stripe has confirmed payment. Your order reference is <strong>{status.id.slice(0,8).toUpperCase()}</strong>. Food will be provided at your event.</p>:<p>We are waiting for secure payment confirmation. Returning from Stripe does not by itself mean the payment succeeded. Please do not place another order until the status is known.</p>}{error&&<p role="alert" style={{color:"#a32c26"}}>{error}</p>}<div style={{display:"flex",gap:13,justifyContent:"center",flexWrap:"wrap",marginTop:25}}><Link href="/account?tab=orders" style={{background:"#a32c27",borderRadius:9,padding:"13px 19px",color:"white",textDecoration:"none"}}>My Orders</Link><Link href="/events" style={{border:"1px solid #a32c27",borderRadius:9,padding:"13px 19px",color:"#a32c27",textDecoration:"none"}}>Explore events</Link></div></section></main>;
}