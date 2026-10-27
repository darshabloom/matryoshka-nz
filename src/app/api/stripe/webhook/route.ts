import {NextResponse} from "next/server";
import {createHmac,timingSafeEqual} from "node:crypto";
import {serviceClient} from "@/lib/server/checkout-security";
export const runtime="nodejs";
export async function POST(req:Request){
 const secret=process.env.STRIPE_WEBHOOK_SECRET;
 if(!secret)return NextResponse.json({error:"Webhook not configured"},{status:503});
 const signature=req.headers.get("stripe-signature")||"",body=await req.text();
 const parts=Object.fromEntries(signature.split(",").map(p=>p.trim().split("=")));
 const timestamp=Number(parts.t),provided=signature.split(",").filter(p=>p.trim().startsWith("v1=")).map(p=>p.trim().slice(3));
 if(!Number.isFinite(timestamp)||Math.abs(Math.floor(Date.now()/1000)-timestamp)>300)return NextResponse.json({error:"Invalid Stripe signature timestamp"},{status:400});
 const computed=createHmac("sha256",secret).update(`${timestamp}.${body}`).digest("hex");
 const ok=provided.some(sig=>/^[a-f0-9]{64}$/i.test(sig)&&timingSafeEqual(Buffer.from(sig,"hex"),Buffer.from(computed,"hex")));
 if(!ok)return NextResponse.json({error:"Invalid webhook signature"},{status:400});
 let event:any;try{event=JSON.parse(body)}catch{return NextResponse.json({error:"Invalid webhook payload"},{status:400})}
 const type=event.type,session=event.data?.object;
 if(!session||typeof session.id!=="string")return NextResponse.json({received:true});
 try{
  const db=serviceClient();
  if(["checkout.session.completed","checkout.session.async_payment_succeeded"].includes(type)){
   if(session.payment_status!=="paid")return NextResponse.json({received:true});
   const {data:order}=await db.from("food_orders").select("id,subtotal_cents,payment_status").eq("stripe_session_id",session.id).maybeSingle();
   if(!order)return NextResponse.json({error:"Order not found"},{status:409});
   if(session.currency!=="nzd"||session.amount_total!==order.subtotal_cents||session.metadata?.order_id!==order.id)return NextResponse.json({error:"Payment data mismatch"},{status:409});
   if(order.payment_status!=="paid"){
    const {error}=await db.from("food_orders").update({status:"confirmed",payment_status:"paid",paid_at:new Date().toISOString(),stripe_payment_intent_id:typeof session.payment_intent==="string"?session.payment_intent:null,updated_at:new Date().toISOString()}).eq("id",order.id).eq("payment_status","pending");
    if(error)throw error;
   }
  }else if(["checkout.session.expired","checkout.session.async_payment_failed"].includes(type)){
   const {error}=await db.from("food_orders").update({status:"payment_failed",payment_status:"failed",updated_at:new Date().toISOString()}).eq("stripe_session_id",session.id).eq("payment_status","pending");
   if(error)throw error;
  }else if(type==="charge.refunded"&&session.payment_intent&&session.refunded===true){
   const {error}=await db.from("food_orders").update({status:"cancelled",payment_status:"refunded",updated_at:new Date().toISOString()}).eq("stripe_payment_intent_id",session.payment_intent).eq("payment_status","paid");
   if(error)throw error;
  }
  return NextResponse.json({received:true});
 }catch(e){console.error("Unable to process Stripe event",type);return NextResponse.json({error:"Could not process webhook"},{status:500})}
}
