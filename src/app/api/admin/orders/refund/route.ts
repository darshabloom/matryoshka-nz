import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {serviceClient} from "@/lib/server/checkout-security";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(req:Request){
 const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:"Sign-in required"},{status:401});
 const {data:admin}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(!admin)return NextResponse.json({error:"Admin only"},{status:403});
 if(!process.env.STRIPE_SECRET_KEY||!process.env.SUPABASE_SERVICE_ROLE_KEY)return NextResponse.json({error:"Stripe refunds are not configured"},{status:503});
 let x:any;try{x=await req.json()}catch{return NextResponse.json({error:"Invalid request"},{status:400})}
 if(!UUID.test(x.orderId??"")||x.confirm!=="REFUND"||typeof x.reason!=="string"||x.reason.trim().length<8)return NextResponse.json({error:"Confirm REFUND and provide a meaningful reason"},{status:400});
 const service=serviceClient(),{data:order}=await service.from("food_orders").select("id,subtotal_cents,payment_status,status,stripe_payment_intent_id").eq("id",x.orderId).maybeSingle();
 if(!order)return NextResponse.json({error:"Order not found"},{status:404});
 if(order.payment_status!=="paid"||!order.stripe_payment_intent_id)return NextResponse.json({error:"No captured payment is eligible for refund"},{status:409});
 if(!["confirmed","cancel_requested","locked"].includes(order.status))return NextResponse.json({error:"Order status is not refundable using this action"},{status:409});
 const {error:auditError}=await service.from("food_order_admin_actions").insert({order_id:order.id,admin_id:user.id,action:"refund_requested",note:x.reason.trim().slice(0,1000)});
 if(auditError)return NextResponse.json({error:"Refund audit log unavailable"},{status:503});
 const params=new URLSearchParams({payment_intent:order.stripe_payment_intent_id,reason:"requested_by_customer"});
 try{
  const r=await fetch("https://api.stripe.com/v1/refunds",{method:"POST",headers:{Authorization:`Bearer ${process.env.STRIPE_SECRET_KEY}`,"Content-Type":"application/x-www-form-urlencoded","Idempotency-Key":`matryoshka-full-refund-${order.id}`},body:params.toString(),cache:"no-store"});
  const refund=await r.json();
  if(!r.ok||!refund.id){await service.from("food_order_admin_actions").insert({order_id:order.id,admin_id:user.id,action:"refund_failed",note:"Stripe rejected the refund. Check Stripe dashboard."});return NextResponse.json({error:"Stripe could not process this refund. Check the Stripe dashboard before retrying."},{status:502})}
  if(refund.status==="succeeded"){
   const {error:updateError}=await service.from("food_orders").update({payment_status:"refunded",status:"cancelled",updated_at:new Date().toISOString()}).eq("id",order.id).eq("payment_status","paid");
   if(updateError)return NextResponse.json({error:"Refund succeeded in Stripe but local status needs reconciliation. Check Stripe dashboard."},{status:503});
  }
  await service.from("food_order_admin_actions").insert({order_id:order.id,admin_id:user.id,action:refund.status==="succeeded"?"refund_succeeded":"refund_pending",note:x.reason.trim().slice(0,1000),stripe_refund_id:refund.id});
  return NextResponse.json({ok:true,status:refund.status});
 }catch{
  await service.from("food_order_admin_actions").insert({order_id:order.id,admin_id:user.id,action:"refund_failed",note:"Network response unavailable; reconcile in Stripe before retrying."});
  return NextResponse.json({error:"Stripe response unavailable. Check Stripe dashboard before retrying."},{status:503});
 }
}
