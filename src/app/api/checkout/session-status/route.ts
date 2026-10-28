import {NextResponse} from "next/server";
import {serviceClient} from "@/lib/server/checkout-security";
export const dynamic="force-dynamic";
export async function GET(req:Request){
 const sessionId=new URL(req.url).searchParams.get("session_id")||"";
 if(!/^cs_(test_|live_)[a-zA-Z0-9_]{10,250}$/.test(sessionId))return NextResponse.json({error:"Invalid session"},{status:400});
 if(!process.env.SUPABASE_SERVICE_ROLE_KEY)return NextResponse.json({error:"Service unavailable"},{status:503});
 const db=serviceClient();
 const {data,error}=await db.from("food_orders").select("id,payment_status,status,created_at,paid_at").eq("stripe_session_id",sessionId).maybeSingle();
 if(error||!data)return NextResponse.json({error:"Order not found"},{status:404});
 return NextResponse.json({id:data.id,paymentStatus:data.payment_status,status:data.status,paidAt:data.paid_at},{headers:{"Cache-Control":"no-store"}});
}