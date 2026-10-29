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
 // Phase C: the December 2026 event must be verified against the original
 // Yumorilnik paid booking on EVERY food checkout. Local imports alone do
 // not prove a ticket is still paid, uncancelled and owned by this email.
 if(eventId==="3b7d5371-926e-408b-a4b7-af69f27b42cf"){
  const shared=process.env.CROSS_SITE_TICKET_VERIFY_SECRET;
  if(!shared||shared.length<32)throw Error("Private Yumorilnik verification is not configured");
  const response=await fetch("https://yumorilnik.com/api/internal/validate-paid-ticket",{
   method:"POST",
   headers:{"Content-Type":"application/json","Authorization":"Bearer "+shared},
   body:JSON.stringify({eventId:"3f6fa4d1-aaca-4326-9c01-5774cffca2f5",
    reference:ref,email:email.trim().toLowerCase()}),
   signal:AbortSignal.timeout(8000),cache:"no-store",
  });
  if(!response.ok)throw Error("Yumorilnik ticket verification service is unavailable");
  const result=await response.json() as {valid?:boolean};
  if(result.valid!==true){
   // Any previously imported record is invalidated on a verified rejection.
   const {error:revocationError}=await db.from("verified_event_bookings")
    .update({status:"cancelled"}).eq("event_id",eventId)
    .eq("booking_ref_hash",digest).eq("booking_email",email.trim().toLowerCase())
    .eq("status","valid");
   if(revocationError)throw Error("Could not revoke invalid food-order eligibility");
   return null;
  }
  const {data:prior,error:readError}=await db.from("verified_event_bookings")
   .select("id,status").eq("event_id",eventId).eq("booking_ref_hash",digest)
   .eq("booking_email",email.trim().toLowerCase()).maybeSingle();
  if(readError)throw Error("Could not inspect food-order eligibility");
  if(prior?.status==="used")return null;
  const {data:linked,error:linkError}=await db.from("verified_event_bookings")
   .upsert({event_id:eventId,booking_ref_hash:digest,
    booking_email:email.trim().toLowerCase(),status:"valid",source:"yumorilnik_paid_live"},
    {onConflict:"event_id,booking_ref_hash,booking_email"})
   .select("id").single();
  if(linkError||!linked)throw Error("Could not link verified ticket to food checkout");
  return linked.id;
 }

 const {data,error}=await db.from("verified_event_bookings").select("id,status").eq("event_id",eventId).eq("booking_ref_hash",digest).eq("booking_email",email.trim().toLowerCase()).eq("status","valid").maybeSingle();
 if(error)throw Error("Ticket validation is unavailable");
 return data?.id??null;
}
