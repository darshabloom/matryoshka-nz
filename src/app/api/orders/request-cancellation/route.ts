import {NextResponse} from "next/server";
import {serviceClient} from "@/lib/server/checkout-security";
export async function POST(req:Request){
 if(!process.env.SUPABASE_SERVICE_ROLE_KEY)return NextResponse.json({error:"Order management is not yet configured"},{status:503});
 let data:any;try{data=await req.json()}catch{return NextResponse.json({error:"Invalid request"},{status:400})}
 const session=typeof data.sessionId==="string"?data.sessionId:"",email=typeof data.email==="string"?data.email.trim().toLowerCase():"";
 if(!/^cs_(test_|live_)[a-zA-Z0-9_]{10,250}$/.test(session)||!email||email.length>254)return NextResponse.json({error:"Enter the payment session and booking email"},{status:400});
 const db=serviceClient();
 const {data:order}=await db.from("food_orders").select("id,status,payment_status,paid_at,events(ordering_closes_at)").eq("stripe_session_id",session).eq("email",email).maybeSingle();
 if(!order)return NextResponse.json({error:"We couldn't verify this order. Please contact the organiser."},{status:404});
 if(order.status==="cancel_requested")return NextResponse.json({ok:true,alreadyRequested:true});
 const paid=order.paid_at?new Date(order.paid_at).getTime():0;
 const deadline=(order.events as any)?.ordering_closes_at;
 if(order.payment_status!=="paid"||order.status!=="confirmed"||!paid||Date.now()-paid>10*60*1000||(deadline&&Date.now()>new Date(deadline).getTime()))return NextResponse.json({error:"The self-service cancellation request window has closed. Please contact Marina for help."},{status:409});
 const {data:updated,error}=await db.from("food_orders").update({status:"cancel_requested",updated_at:new Date().toISOString()}).eq("id",order.id).eq("status","confirmed").select("id").maybeSingle();
 if(error||!updated)return NextResponse.json({error:"Unable to record this request. Contact the organiser."},{status:409});
 return NextResponse.json({ok:true,info:"Your cancellation request is recorded. It is not an automatic refund; Marina must review it."});
}
