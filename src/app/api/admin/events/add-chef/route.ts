import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase/server";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(req:Request){
 const db=await createSupabaseServerClient();
 const {data:{user}}=await db.auth.getUser();if(!user)return NextResponse.json({error:"Sign in required"},{status:401});
 const {data:admin}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(!admin)return NextResponse.json({error:"Admin only"},{status:403});
 let body:any;try{body=await req.json()}catch{return NextResponse.json({error:"Invalid request"},{status:400})}
 if(!UUID.test(body.eventId??"")||!UUID.test(body.vendorId??""))
  return NextResponse.json({error:"Choose an event and chef"},{status:400});
 const [{data:event},{data:chef}]=await Promise.all([
  db.from("events").select("id").eq("id",body.eventId).maybeSingle(),
  db.from("vendors").select("id").eq("id",body.vendorId).maybeSingle()
 ]);
 if(!event||!chef)return NextResponse.json({error:"Event or chef not found"},{status:404});
 const {data:already,error:readError}=await db.from("chef_event_applications")
  .select("status").eq("event_id",event.id).eq("vendor_id",chef.id).maybeSingle();
 if(readError)return NextResponse.json({error:"Unable to check chef participation"},{status:503});
 if(already?.status==="approved")return NextResponse.json({ok:true,alreadyApproved:true});
 const {error}=await db.from("chef_event_applications").upsert({
  event_id:event.id,vendor_id:chef.id,status:"approved",
  message:"Invited directly by organiser",review_note:"Added by organiser",
  reviewed_by:user.id,reviewed_at:new Date().toISOString(),
  fulfilment:"at_event"
 },{onConflict:"event_id,vendor_id"});
 if(error)return NextResponse.json({error:"Unable to add chef to event"},{status:500});
 return NextResponse.json({ok:true});
}
