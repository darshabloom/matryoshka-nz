import {NextRequest,NextResponse} from "next/server";
import {timingSafeEqual} from "node:crypto";
import {serviceClient} from "@/lib/server/checkout-security";
import {dispatchPaidFoodEmails} from "@/lib/server/food-order-emails";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
/** Protected retry processor for existing paid order notifications.
 * Requires a separately configured secret and does not change payment state.
 */
export async function POST(req:NextRequest){
 const expected=process.env.FOOD_ORDER_PROCESSOR_SECRET??"";
 const supplied=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")??"";
 const a=Buffer.from(supplied),b=Buffer.from(expected);
 if(expected.length<32||a.length!==b.length||!timingSafeEqual(a,b))
  return NextResponse.json({error:"Unauthorised"},{status:401});
 if(process.env.FOOD_ORDER_EMAILS_ENABLED!=="true"||!process.env.RESEND_API_KEY||!process.env.FOOD_ORDER_FROM_EMAIL)
  return NextResponse.json({ready:false,reason:"Email sending not enabled"},{status:503});
 const db=serviceClient();
 const {data,error}=await db.from("food_order_email_deliveries")
  .select("order_id").in("status",["pending","failed"]).lte("next_attempt_at",new Date().toISOString())
  .order("created_at",{ascending:true}).limit(50);
 if(error)return NextResponse.json({error:"Queue unavailable"},{status:503});
 const ids=[...new Set((data??[]).map(x=>x.order_id))];
 const totals={orders:0,sent:0,failed:0,skipped:0};
 for(const id of ids.slice(0,10)){
  try{const s=await dispatchPaidFoodEmails(id);
   totals.orders++;totals.sent+=s.sent;totals.failed+=s.failed;totals.skipped+=s.skipped;
  }catch(e){console.error("Food email retry failed",e instanceof Error?e.message:"unknown");totals.failed++}
 }
 return NextResponse.json(totals,{headers:{"Cache-Control":"no-store"}});
}
