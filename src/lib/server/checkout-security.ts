import "server-only";
import {createHash,timingSafeEqual} from "node:crypto";
import {createClient} from "@supabase/supabase-js";
export function serviceClient(){
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY,url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 if(!key||!url)throw Error("Secure database access is not configured");
 return createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
}
export function isCheckoutConfigured(){return process.env.CHECKOUT_ENABLED==="true"&&!!process.env.STRIPE_SECRET_KEY&&!!process.env.STRIPE_WEBHOOK_SECRET&&!!process.env.SUPABASE_SERVICE_ROLE_KEY&&!!process.env.TICKET_HASH_PEPPER}
export async function checkTicket(db:ReturnType<typeof serviceClient>,eventId:string,email:string,reference:string){
 if(!process.env.TICKET_HASH_PEPPER)throw Error("Ticket verification not configured");
 const ref=reference.trim().toUpperCase().replace(/\s+/g,"");
 if(ref.length<3||ref.length>100)return null;
 const digest=createHash("sha256").update(`${process.env.TICKET_HASH_PEPPER}:${ref}`).digest("hex");
 const {data,error}=await db.from("verified_event_bookings").select("id,status").eq("event_id",eventId).eq("booking_ref_hash",digest).eq("booking_email",email.trim().toLowerCase()).eq("status","valid").maybeSingle();
 if(error)throw Error("Ticket validation is unavailable");
 return data?.id??null;
}
