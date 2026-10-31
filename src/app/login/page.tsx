"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
    const router = useRouter();
    const supabase = createSupabaseBrowserClient();

    const [email, setEmail] = useState("");
    const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
    const [error, setError] = useState<string>("");

    async function signInWithGoogle() {
        setStatus("sending");
        setError("");
        const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback` } });
        if (error) { setStatus("error"); setError(error.message); }
    }

    async function signIn(e: React.FormEvent) {
        e.preventDefault();
        setStatus("sending");
        setError("");

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${location.origin}/auth/callback`,
            },
        });

        if (error) {
            setStatus("error");
            setError(error.message);
            return;
        }

        setStatus("sent");
    }

    return (
        <main style={{ maxWidth: 420, margin: "60px auto", padding: 24 }}>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}>Sign in</h1>
            <p style={{ opacity: 0.8, marginBottom: 20 }}>
                Enter your email. We’ll send a sign-in link.
            </p>

            <button type="button" onClick={signInWithGoogle} disabled={status === "sending"} style={{width:"100%",padding:14,borderRadius:10,border:"1px solid #aaa",background:"white",color:"#111",cursor:"pointer",marginBottom:16}}>Continue with Google</button>

            <form onSubmit={signIn} style={{ display: "grid", gap: 12 }}>
                <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="you@example.com"
                    required
                    style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
                />

                <button
                    type="submit"
                    disabled={status === "sending"}
                    style={{
                        padding: 12,
                        borderRadius: 10,
                        border: "1px solid #111",
                        background: "#111",
                        color: "#fff",
                        cursor: "pointer",
                    }}
                >
                    {status === "sending" ? "Sending..." : "Send login link"}
                </button>

                {status === "sent" ? (
                    <p style={{ color: "green" }}>Check your email for the login link.</p>
                ) : null}

                {status === "error" ? (
                    <p style={{ color: "crimson" }}>{error}</p>
                ) : null}
            </form>

            <div style={{ marginTop: 18 }}>
                <button
                    onClick={() => router.push("/")}
                    style={{ background: "transparent", border: "none", textDecoration: "underline", cursor: "pointer" }}
                >
                    Back to site
                </button>
            </div>
        </main>
    );
}
