"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
const eventId="3b7d5371-926e-408b-a4b7-af69f27b42cf";
const dishId="7f0f8639-dd8c-4aae-963a-a8bea61bced0";
export default function TestCustomerCheckout(){
 const[email,setEmail]=useState("dannylaker13@gmail.com"),[phone,setPhone]=useState(""),[ticket,setTicket]=useState(""),[allergy,setAllergy]=useState("none"),[allergyDetails,setAllergyDetails]=useState("");
 const[quote,setQuote]=useState<any>(null),[status,setStatus]=useState<any>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{fetch("/api/checkout/status",{cache:"no-store"}).then(r=>r.json()).then(setStatus).catch(()=>setStatus({enabled:false}));fetch("/api/checkout/quote",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({eventId,items:[{dishId,quantity:1,optionIds:[]}]})}).then(async r=>{const j=await r.json();if(!r.ok)throw Error(j.error||"Unavailable");setQuote(j)}).catch(e=>setError(e.message))},[]);
 async function pay(){setError("");setBusy(true);try{
 const r=await fetch("/api/checkout/start",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({eventId,items:[{dishId,quantity:1,optionIds:[],note:"Payment test only — no food"}],email,phone,ticketReference:ticket,allergyDeclaration:allergy,allergyDetails:allergy==="declared"?allergyDetails:"",specialRequests:"TEST ORDER — NO FOOD FULFILMENT",idempotencyKey:crypto.randomUUID()})});
 const j=await r.json();if(!r.ok)throw Error(j.error||"Payment unavailable");if(!j.url?.startsWith("https://checkout.stripe.com/"))throw Error("Invalid payment destination");location.assign(j.url);
 }catch(e){setError(e instanceof Error?e.message:"Payment error");setBusy(false)}}
 return <main style={{maxWidth:600,margin:"45px auto",padding:22,display:"grid",gap:18}}>
 <Link href="/events">← Events</Link><h1>Customer payment test</h1>
 <p>This is a live Stripe transaction for the Matryoshka order system. No food will be prepared or delivered. This page is restricted to the designated signed-in customer.</p>
 <strong>DarshaCooks · Payment verification item — NZ$0.55</strong>
 {!status?.enabled&&<p style={{color:"#9d382e"}}>Restricted payment is not enabled for this account. Please sign in using the authorised customer email.</p>}
 <label style={{display:"grid",gap:5}}>Booking email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} style={{padding:12}}/></label>
 <label style={{display:"grid",gap:5}}>Contact phone<input type="tel" required value={phone} onChange={e=>setPhone(e.target.value)} style={{padding:12}}/></label>
 <label style={{display:"grid",gap:5}}>Paid Yumorilnik event ticket reference<input required value={ticket} onChange={e=>setTicket(e.target.value.toUpperCase())} placeholder="YMR-…" style={{padding:12}}/></label>
 <fieldset><legend>Food allergies</legend><label><input type="radio" checked={allergy==="none"} onChange={()=>setAllergy("none")}/> No known allergies</label><label style={{marginLeft:12}}><input type="radio" checked={allergy==="declared"} onChange={()=>setAllergy("declared")}/> Allergies to declare</label>{allergy==="declared"&&<textarea value={allergyDetails} onChange={e=>setAllergyDetails(e.target.value)} placeholder="Details" style={{width:"100%",minHeight:70}}/>}</fieldset>
 {quote&&<p>Live charge: NZ${(quote.subtotalCents/100).toFixed(2)}</p>}
 {error&&<p role="alert" style={{color:"#9d382e"}}>{error}</p>}
 <button type="button" onClick={pay} disabled={!status?.enabled||!quote||busy||!phone.trim()||!ticket.trim()||(allergy==="declared"&&!allergyDetails.trim())} style={{padding:16,border:0,borderRadius:8,background:"#a32e28",color:"white",fontWeight:800,cursor:"pointer"}}>{busy?"Connecting to Stripe…":"Pay NZ$0.55 securely"}</button>
 <small>The amount will be charged to your card. The test can be refunded afterwards. Only proceed if you intend to make a real payment.</small>
 </main>
}
