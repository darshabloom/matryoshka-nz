import {createHash} from "node:crypto";
import {createClient} from "@supabase/supabase-js";
export function serviceClient(){
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY,url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 if(!key||!url)throw Error("Secure database access is not configured");
 return createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
}
export function isCheckoutConfigured(){
 // A Preview deployment must never initiate real charges, even if a live key is mistakenly configured.
 const secret=process.env.STRIPE_SECRET_KEY;
 const safeStripeKey=process.env.VERCEL_ENV!=="preview"||secret?.startsWith("sk_test_")===true;
 return safeStripeKey&&process.env.CHECKOUT_ENABLED==="true"&&!!secret&&!!process.env.STRIPE_WEBHOOK_SECRET&&!!process.env.SUPABASE_SERVICE_ROLE_KEY&&!!process.env.TICKET_HASH_PEPPER&&!!process.env.NEXT_PUBLIC_SITE_URL;
}
export async function checkTicket(db:ReturnType<typeof serviceClient>,eventId:string,email:string,reference:string){
 if(!process.env.TICKET_HASH_PEPPER)throw Error("Ticket verification not configured");
 const ref=reference.trim().toUpperCase().replace(/\s+/g,"");
 if(ref.length<3||ref.length>100)return null;
 const digest=createHash("sha256").update(`${process.env.TICKET_HASH_PEPPER}:${ref}`).digest("hex");
 const {data,error}=await db.from("verified_event_bookings").select("id,status").eq("event_id",eventId).eq("booking_ref_hash",digest).eq("booking_email",email.trim().toLowerCase()).eq("status","valid").maybeSingle();
 if(error)throw Error("Ticket validation is unavailable");
 return data?.id??null;
}
