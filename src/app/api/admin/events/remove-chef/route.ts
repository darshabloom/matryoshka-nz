import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase/server";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(req:Request){
 const db=await createSupabaseServerClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:"Sign in required"},{status:401});
 const {data:admin}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(!admin)return NextResponse.json({error:"Admin only"},{status:403});
 let input:any;try{input=await req.json()}catch{return NextResponse.json({error:"Invalid request"},{status:400})}
 if(typeof input?.eventId!=="string"||typeof input?.vendorId!=="string"||!UUID.test(input.eventId)||!UUID.test(input.vendorId))
  return NextResponse.json({error:"Invalid event or chef"},{status:400});
 const {data:application,error:readError}=await db.from("chef_event_applications").select("id,status")
  .eq("event_id",input.eventId).eq("vendor_id",input.vendorId).maybeSingle();
 if(readError)return NextResponse.json({error:"Unable to check participation"},{status:503});
 if(!application||application.status!=="approved")return NextResponse.json({error:"Chef is not participating"},{status:409});
 const {data:updated,error}=await db.from("chef_event_applications").update({
  status:"rejected",review_note:"Removed from event by organiser",reviewed_by:user.id,reviewed_at:new Date().toISOString()
 }).eq("id",application.id).eq("status","approved").select("id").maybeSingle();
 if(error||!updated)return NextResponse.json({error:"Unable to remove chef"},{status:409});
 return NextResponse.json({ok:true});
}
