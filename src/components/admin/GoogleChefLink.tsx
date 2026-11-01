"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function GoogleChefLink({vendorId,linkedCount}:{vendorId:string;linkedCount:number}) {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [passwordStatus,setPasswordStatus]=useState("");
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
  async function setChefPassword(e:React.FormEvent) {
    e.preventDefault(); setBusy(true); setPasswordStatus("");
    try {
      const response = await fetch("/api/admin/vendor-password", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({vendorId,email:email.trim(),password})});
      const data = await response.json();
      setPasswordStatus(response.ok ? "Password saved on this chef's existing account. Google sign-in remains available." : (data.error ?? "Unable to set password."));
      if (response.ok) setPassword("");
    } catch { setPasswordStatus("Connection failed. Please try again."); }
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
    <hr style={{margin:"20px 0"}} />
    <h2>Set chef login password</h2>
    <p>Enter the email already linked to this chef and choose a strong temporary password. The chef can still use Google. Share the password privately.</p>
    <form onSubmit={setChefPassword} style={{display:"grid",gap:10}}>
      <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Linked chef email" aria-label="Linked chef email" style={{padding:12,border:"1px solid #aaa",borderRadius:8}}/>
      <input type="password" required minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Temporary password (at least 12 characters)" aria-label="Temporary password" autoComplete="new-password" style={{padding:12,border:"1px solid #aaa",borderRadius:8}}/>
      <button type="submit" disabled={busy} style={{padding:12,borderRadius:8,background:"#222",color:"white"}}>{busy?"Saving…":"Set chef password"}</button>
    </form>
    {passwordStatus && <p role="status">{passwordStatus}</p>}
  </section>;
}
