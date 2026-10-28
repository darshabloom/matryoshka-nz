import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase/server";
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export async function POST(req:Request){
 const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:"Sign-in required"},{status:401});
 const {data:admin}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(!admin)return NextResponse.json({error:"Admin only"},{status:403});
 let data:any;try{data=await req.json()}catch{return NextResponse.json({error:"Invalid request"},{status:400})}
 if(!UUID.test(data.dishId??"")||!UUID.test(data.vendorId??""))return NextResponse.json({error:"Choose a dish and chef"},{status:400});
 const {error}=await db.rpc("request_dish_assignment",{p_dish_id:data.dishId,p_vendor_id:data.vendorId});
 if(error)return NextResponse.json({error:error.message||"Cannot assign dish"},{status:409});
 return NextResponse.json({ok:true,status:"pending",message:"Assignment sent to the chef for acceptance."});
}
