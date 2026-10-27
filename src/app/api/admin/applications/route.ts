import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase/server";
export async function PATCH(request:Request){
 const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:"Sign in"},{status:401});
 const {data:admin}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(!admin)return NextResponse.json({error:"Admin only"},{status:403});
 let input:any;try{input=await request.json()}catch{return NextResponse.json({error:"Invalid request"},{status:400})}
 if(!["approved","rejected","changes_requested"].includes(input.status)||typeof input.id!=="string")return NextResponse.json({error:"Invalid review"},{status:400});
 const note=typeof input.note==="string"?input.note.trim().slice(0,2000):"";
 if(input.status!=="approved"&&!note)return NextResponse.json({error:"Please provide a reason"},{status:400});
 const {data:current}=await db.from("chef_event_applications").select("id,status").eq("id",input.id).maybeSingle();
 if(!current||current.status!=="pending")return NextResponse.json({error:"Only pending applications can be reviewed"},{status:409});
 const {data:updated,error}=await db.from("chef_event_applications").update({status:input.status,review_note:note,reviewed_by:user.id,reviewed_at:new Date().toISOString()}).eq("id",input.id).eq("status","pending").select("id").maybeSingle();
 if(error||!updated)return NextResponse.json({error:"Review could not be saved"},{status:409});
 await db.from("chef_application_reviews").insert({application_id:input.id,actor_id:user.id,action:input.status,note});
 return NextResponse.json({ok:true});
}
