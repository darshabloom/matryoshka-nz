import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});

/** Organiser-only, read-only cross-site handshake test.
 * Deliberately checks a nonexistent ticket and never changes an order or ticket.
 */
export async function GET(){
 const db=await createSupabaseServerClient();
 const {data:{user},error:authError}=await db.auth.getUser();
 if(authError||!user)return reply({error:"Sign in required"},401);
 const {data:admin,error:roleError}=await db.from("site_admins")
  .select("user_id").eq("user_id",user.id).maybeSingle();
 if(roleError||!admin)return reply({error:"Organiser access required"},403);
 const secret=process.env.CROSS_SITE_TICKET_VERIFY_SECRET;
 if(!secret||secret.length<32)return reply({
  connected:false,negativeTestPassed:false,
  explanation:"Private Yumorilnik verification is not configured"
 },503);
 try{
  const response=await fetch("https://yumorilnik.com/api/internal/validate-paid-ticket",{
   method:"POST",
   headers:{"Content-Type":"application/json","Authorization":"Bearer "+secret},
   body:JSON.stringify({
    eventId:"3f6fa4d1-aaca-4326-9c01-5774cffca2f5",
    reference:"YMR-NOT-REAL-TEST-0000001",email:"test-ticket@example.invalid"
   }),
   cache:"no-store",signal:AbortSignal.timeout(8000)
  });
  if(!response.ok)return reply({connected:false,negativeTestPassed:false,
   explanation:"Yumorilnik did not accept the authorised test request"},503);
  const data=await response.json() as {valid?:unknown};
  if(data.valid!==false)return reply({connected:false,negativeTestPassed:false,
   explanation:"Ticket rejection check returned an unexpected result"},502);
  return reply({connected:true,negativeTestPassed:true,
   positivePaidTicketTested:false,
   explanation:"Secure connection works and a nonexistent ticket is rejected. A genuine paid ticket still needs end-to-end testing."});
 }catch{
  return reply({connected:false,negativeTestPassed:false,
   explanation:"Yumorilnik verification service could not be reached"},503);
 }
}
