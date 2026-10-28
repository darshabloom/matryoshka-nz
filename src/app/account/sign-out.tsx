"use client";
import {useRouter} from "next/navigation";
import {createSupabaseBrowserClient} from "@/lib/supabase/client";
export default function SignOut(){
 const router=useRouter();return <button style={{padding:"11px 20px",background:"white",border:"1px solid #bbb",borderRadius:8,cursor:"pointer"}} onClick={async()=>{await createSupabaseBrowserClient().auth.signOut();router.replace("/sign-in");router.refresh()}}>Sign out / Выйти</button>;
}