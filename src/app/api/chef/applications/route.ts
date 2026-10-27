import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase/server";
export async function POST(request:Request){
 const db=await createSupabaseServerClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:"Sign in first"},{status:401});
 let input:any;try{input=await request.json()}catch{return NextResponse.json({error:"Invalid request"},{status:400})}
 if(typeof input.event_id!=="string"||typeof input.vendor_id!=="string")return NextResponse.json({error:"Choose an event"},{status:400});
 const {data:member}=await db.from("vendor_users").select("vendor_id").eq("user_id",user.id).eq("vendor_id",input.vendor_id).maybeSingle();
 if(!member)return NextResponse.json({error:"Chef account required"},{status:403});
 const {data:event}=await db.from("events").select("id").eq("id",input.event_id).eq("is_published",true).eq("chef_applications_open",true).gt("ends_at",new Date().toISOString()).maybeSingle();
 if(!event)return NextResponse.json({error:"Applications aren't open for this event"},{status:400});
 const {data:existing}=await db.from("chef_event_applications").select("id,status").eq("vendor_id",input.vendor_id).eq("event_id",input.event_id).maybeSingle();
 if(existing && !["changes_requested","withdrawn"].includes(existing.status))return NextResponse.json({error:"You've already applied"},{status:409});
 const details={status:"pending",message:typeof input.message==="string"?input.message.slice(0,2000):"",fulfilment:["collection","onsite","other"].includes(input.fulfilment)?input.fulfilment:"collection"};
 const result=existing
  ?await db.from("chef_event_applications").update(details).eq("id",existing.id).select("id").single()
  :await db.from("chef_event_applications").insert({event_id:input.event_id,vendor_id:input.vendor_id,...details}).select("id").single();
 if(result.error)return NextResponse.json({error:"Application could not be saved"},{status:500});
 return NextResponse.json({id:result.data.id,ok:true});
}
