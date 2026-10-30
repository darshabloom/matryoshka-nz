"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {FoodOrderReceipt,type PaidFoodReceipt} from "@/components/orders/FoodOrderReceipt";
import styles from "./receipt.module.css";

export default function PrintableFoodReceipt(){
 const [receipt,setReceipt]=useState<PaidFoodReceipt|null>(null);
 const [error,setError]=useState("");
 useEffect(()=>{
  const session=new URLSearchParams(window.location.search).get("session_id")||"";
  if(!/^cs_(test_|live_)[A-Za-z0-9_]{10,250}$/.test(session)){setError("Invalid order receipt link");return;}
  let active=true;
  fetch("/api/checkout/session-status?session_id="+encodeURIComponent(session),{cache:"no-store"})
   .then(async response=>{const result=await response.json();
    if(!response.ok)throw Error(result.error||"Unable to load receipt");
    if(result.paymentStatus!=="paid"||!result.masterReference)throw Error("The order has not been confirmed as paid");
    return result as PaidFoodReceipt;
   }).then(result=>{if(active)setReceipt(result)})
   .catch(e=>{if(active)setError(e instanceof Error?e.message:"Receipt not available")});
  return()=>{active=false};
 },[]);
 return <main className={styles.page}>
  <div className={styles.toolbar}>
   <Link href="/events" className={styles.back}>← Matryoshka</Link>
   <div><h1>Food order confirmation</h1><p>Print this page and choose “Save as PDF” to keep your receipt.</p></div>
   <button type="button" onClick={()=>window.print()} disabled={!receipt} className={styles.print}>Print / Save as PDF</button>
  </div>
  {!receipt&&!error&&<p role="status">Verifying payment and preparing your receipt…</p>}
  {error&&<p role="alert" className={styles.error}>{error}</p>}
  {receipt&&<FoodOrderReceipt receipt={receipt}/>}
 </main>;
}
