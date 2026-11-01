"use client";
import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function PasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 12 || password !== confirm) { setMessage("Use at least 12 characters and matching passwords."); return; }
    setBusy(true); setMessage("");
    const client = createSupabaseBrowserClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) { setMessage("Sign in with Google first, then return to this page."); setBusy(false); return; }
    const { error } = await client.auth.updateUser({ password });
    setMessage(error ? error.message : "Password saved. You can now sign in with Google or email and password.");
    if (!error) { setPassword(""); setConfirm(""); }
    setBusy(false);
  }
  return <main style={{maxWidth:460,margin:"60px auto",padding:24}}>
    <h1>Set your password</h1>
    <p>Sign in using Google first. Your new password will work with the same account and chef profile.</p>
    <form onSubmit={save} style={{display:"grid",gap:12}}>
      <input aria-label="New password" type="password" autoComplete="new-password" minLength={12} required placeholder="New password (12+ characters)" value={password} onChange={e=>setPassword(e.target.value)} style={{padding:12}}/>
      <input aria-label="Confirm password" type="password" autoComplete="new-password" required placeholder="Confirm password" value={confirm} onChange={e=>setConfirm(e.target.value)} style={{padding:12}}/>
      <button disabled={busy} type="submit" style={{padding:12}}>{busy ? "Saving…" : "Save password"}</button>
    </form>
    <p role="status">{message}</p>
    <Link href="/login">Back to sign in</Link>
  </main>;
}
