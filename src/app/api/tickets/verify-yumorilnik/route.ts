import {NextRequest,NextResponse} from "next/server";
export const dynamic="force-dynamic";
export const runtime="nodejs";
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store, private"}});
/** Read-only, two-factor (unguessable reference + matching email) Yumorilnik
 * live-ticket check. Existing food checkout repeats verification server-side.
 */
export async function POST(req:NextRequest){
 const origin=req.headers.get("origin");
 if(origin&&origin!==req.nextUrl.origin)return reply({error:"Cross-site request rejected"},403);
 let reference="",email="";
 try{
  const raw=await req.text();if(raw.length>800)return reply({error:"Invalid request"},400);
  const payload=JSON.parse(raw) as {reference?:unknown;email?:unknown};
  if(typeof payload.reference==="string")reference=payload.reference.trim().toUpperCase().replace(/\s+/g,"");
  if(typeof payload.email==="string")email=payload.email.trim().toLowerCase();
 }catch{return reply({error:"Invalid request"},400);}
 if(!/^YMR-[A-Z0-9-]{5,80}$/.test(reference)||email.length>254||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  return reply({valid:false,error:"Check your booking reference and booking email"},400);
 const secret=process.env.CROSS_SITE_TICKET_VERIFY_SECRET;
 if(!secret||secret.length<32)return reply({error:"Ticket verification is not configured"},503);
 try{
  const response=await fetch("https://www.yumorilnik.com/api/internal/validate-paid-ticket",{
   method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+secret},
   body:JSON.stringify({eventId:"3f6fa4d1-aaca-4326-9c01-5774cffca2f5",
    reference,email}),cache:"no-store",signal:AbortSignal.timeout(9000),
  });
  if(!response.ok)return reply({error:"Yumorilnik is temporarily unavailable"},503);
  const body=await response.json() as {valid?:boolean};
  return reply({valid:body.valid===true});
 }catch(e){
  console.error("Matryoshka read-only Yumorilnik ticket check unavailable",
   e instanceof Error?e.message:"unknown");
  return reply({error:"Yumorilnik verification is temporarily unavailable"},503);
 }
}
