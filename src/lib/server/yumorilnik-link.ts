import {createHash} from "node:crypto";
import type {SupabaseClient} from "@supabase/supabase-js";
export async function verifyLinkedTicket(db:SupabaseClient,eventId:string,email:string,token:string):Promise<string|null>{
 if(process.env.YUMORILNIK_TICKET_LINK_ENABLED!=="true")return null;
 const endpoint=process.env.YUMORILNIK_TICKET_VERIFY_URL,shared=process.env.MATRYOSHKA_API_SHARED_SECRET,pepper=process.env.TICKET_HASH_PEPPER;
 if(!endpoint||!shared||shared.length<32||!pepper||!token||token.length>2000||eventId!=="3b7d5371-926e-408b-a4b7-af69f27b42cf")return null;
 const url=new URL(endpoint);
 if(url.protocol!=="https:"||url.pathname!=="/api/internal/matryoshka/verify-ticket"||url.search||url.hash||!["yumorilnik.com","www.yumorilnik.com"].includes(url.hostname))return null;
 const response=await fetch(url,{method:"POST",headers:{Authorization:"Bearer "+shared,"Content-Type":"application/json"},body:JSON.stringify({token}),cache:"no-store",signal:AbortSignal.timeout(8000),redirect:"error"});
 if(!response.ok)throw Error("Ticket verification unavailable");
 const result=await response.json() as {valid?:boolean;email?:string;event?:string;referenceId?:string};
 if(!result.valid||result.event!=="novogodnik26"||result.email?.toLowerCase()!==email.trim().toLowerCase()||!result.referenceId||!/^[0-9a-f-]{36}$/i.test(result.referenceId))return null;
 const digest=createHash("sha256").update(pepper+":YUMORILNIK:"+result.referenceId).digest("hex");
 const {data,error}=await db.from("verified_event_bookings").upsert({event_id:eventId,booking_ref_hash:digest,booking_email:email.trim().toLowerCase(),status:"valid",source:"yumorilnik_live_verification"},{onConflict:"event_id,booking_ref_hash,booking_email"}).select("id").single();
 if(error||!data)throw Error("Ticket association unavailable");
 return data.id;
}