"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function GoogleChefLink({vendorId,linkedCount}:{vendorId:string;linkedCount:number}) {
  const [email,setEmail]=useState("");
  const [status,setStatus]=useState("");
  const [busy,setBusy]=useState(false);
  async function link(e:React.FormEvent) {
    e.preventDefault(); setBusy(true); setStatus("");
    const supabase=createSupabaseBrowserClient();
    const {data,error}=await supabase.rpc("admin_link_vendor_google",{p_vendor_id:vendorId,p_email:email.trim()});
    if(error) setStatus(error.message);
    else if(data==="linked") {setStatus("Google account linked. The chef can now sign in and access this profile.");setEmail("");}
    else if(data==="already_linked") setStatus("This Google account is already linked to this chef.");
    else setStatus("No verified Google login found for that email. Ask the chef to sign in with Google first, then try again.");
    setBusy(false);
  }
  return <section style={{padding:16,border:"1px solid #ddd",borderRadius:12,marginBottom:24}}>
    <h2>Google account access</h2>
    <p>{linkedCount} linked account(s). Link a chef's verified Google login to their existing dishes and events.</p>
    <form onSubmit={link} style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Chef's Google email" aria-label="Chef's Google email" style={{padding:12,flex:"1 1 220px",border:"1px solid #aaa",borderRadius:8}} />
      <button disabled={busy} type="submit" style={{padding:12,borderRadius:8,background:"#222",color:"white"}}>{busy?"Linking…":"Link Google account"}</button>
    </form>
    {status && <p role="status">{status}</p>}
  </section>;
}
