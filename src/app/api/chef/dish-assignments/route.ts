import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase/server";
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export async function POST(req:Request){
 const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:"Sign-in required"},{status:401});
 let data:any;try{data=await req.json()}catch{return NextResponse.json({error:"Invalid request"},{status:400})}
 if(!UUID.test(data.dishId??"")||typeof data.accept!=="boolean")return NextResponse.json({error:"Invalid response"},{status:400});
 const {error}=await db.rpc("respond_dish_assignment",{p_dish_id:data.dishId,p_accept:data.accept,p_note:String(data.note??"").slice(0,1500)});
 if(error)return NextResponse.json({error:error.message||"Unable to respond"},{status:409});
 return NextResponse.json({ok:true,status:data.accept?"accepted":"declined"});
}
