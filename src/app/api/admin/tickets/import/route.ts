import {NextResponse} from "next/server";
import {createHash} from "node:crypto";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {serviceClient} from "@/lib/server/checkout-security";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(req:Request){
 const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:"Sign in required"},{status:401});
 const {data:admin}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(!admin)return NextResponse.json({error:"Admin only"},{status:403});
 if(!process.env.TICKET_HASH_PEPPER||!process.env.SUPABASE_SERVICE_ROLE_KEY)return NextResponse.json({error:"Secure ticket import is not configured. Configure the server-side pepper and database secret first."},{status:503});
 let body:any;try{body=await req.json()}catch{return NextResponse.json({error:"Invalid request"},{status:400})}
 if(!UUID.test(body.eventId)||!Array.isArray(body.bookings)||body.bookings.length<1||body.bookings.length>500)return NextResponse.json({error:"Choose an event and 1–500 verified ticket records"},{status:400});
 const service=serviceClient();const {data:event}=await service.from("events").select("id").eq("id",body.eventId).maybeSingle();
 if(!event)return NextResponse.json({error:"Event not found"},{status:404});
 const rows=[];
 for(const record of body.bookings){
  const ref=typeof record.reference==="string"?record.reference.trim().toUpperCase().replace(/\s+/g,""):"";
  const email=typeof record.email==="string"?record.email.trim().toLowerCase():"";
  if(ref.length<3||ref.length>100||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return NextResponse.json({error:"Invalid reference or email. Correct the import and retry."},{status:400});
  rows.push({event_id:body.eventId,booking_ref_hash:createHash("sha256").update(`${process.env.TICKET_HASH_PEPPER}:${ref}`).digest("hex"),booking_email:email,status:"valid",source:"admin_verified_import"});
 }
 const {error}=await service.from("verified_event_bookings").upsert(rows,{onConflict:"event_id,booking_ref_hash,booking_email",ignoreDuplicates:true});
 if(error)return NextResponse.json({error:"Ticket list could not be imported"},{status:500});
 return NextResponse.json({ok:true,processed:rows.length});
}
