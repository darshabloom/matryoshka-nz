import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {eventReadiness} from "@/lib/server/eventReadiness";
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export async function POST(req:Request){
 const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:"Sign-in required"},{status:401});
 const {data:admin}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(!admin)return NextResponse.json({error:"Admin only"},{status:403});
 let x:any;try{x=await req.json()}catch{return NextResponse.json({error:"Invalid request"},{status:400})}
 if(!UUID.test(x.eventId??"")||!["publish","unpublish","open_ordering","close_ordering"].includes(x.action))return NextResponse.json({error:"Invalid event action"},{status:400});
 const readiness=await eventReadiness(db,x.eventId);
 if(x.action==="publish"&&!readiness.publishReady)return NextResponse.json({error:"Complete the event details, venue and dates before publishing.",checks:readiness.checks},{status:409});
 if(x.action==="open_ordering"&&(!readiness.event.is_published||!readiness.orderingReady))return NextResponse.json({error:"Food ordering cannot open until every readiness check passes and the event page is published.",checks:readiness.checks},{status:409});
 const update=x.action==="publish"?{is_published:true}:x.action==="unpublish"?{is_published:false,ordering_enabled:false}:x.action==="open_ordering"?{ordering_enabled:true}:{ordering_enabled:false};
 const {error}=await db.from("events").update({...update,updated_at:new Date().toISOString()}).eq("id",x.eventId);
 if(error)return NextResponse.json({error:"Unable to update event"},{status:500});
 return NextResponse.json({ok:true,...update});
}