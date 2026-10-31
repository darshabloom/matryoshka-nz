import {NextResponse} from "next/server";
import {serviceClient} from "@/lib/server/checkout-security";
export const dynamic="force-dynamic";
export async function GET(req:Request){
 const sessionId=new URL(req.url).searchParams.get("session_id")||"";
 if(!/^cs_(test_|live_)[a-zA-Z0-9_]{10,250}$/.test(sessionId))return NextResponse.json({error:"Invalid session"},{status:400});
 if(!process.env.SUPABASE_SERVICE_ROLE_KEY)return NextResponse.json({error:"Service unavailable"},{status:503});
 const db=serviceClient();
 const {data,error}=await db.from("food_orders").select("id,payment_status,status,created_at,paid_at,master_order_reference,subtotal_cents,events(title_en,location_text,starts_at)").eq("stripe_session_id",sessionId).maybeSingle();
 if(error||!data)return NextResponse.json({error:"Order not found"},{status:404});
 // The Stripe session ID is an unguessable receipt token provided only
 // to the customer by the successful checkout redirect. Never expose
 // contact details, ticket credentials or unpaid order lines here.
 const chefs:{reference:string;vendorId:string;chef:string;items:{name:string;quantity:number;unitPriceCents:number;lineTotalCents:number;options:unknown;note:string}[]}[]=[];
 if(data.payment_status==="paid"){
  const [refs,lines]=await Promise.all([
   db.from("food_order_chef_refs").select("reference,vendor_id,vendors(display_name)").eq("order_id",data.id).order("order_number"),
   db.from("food_order_lines").select("vendor_id,dish_name_snapshot,quantity,unit_price_cents,line_total_cents,option_snapshot,dish_note").eq("order_id",data.id)
  ]);
  if(refs.error||lines.error)return NextResponse.json({error:"Unable to prepare verified food receipt"},{status:503});
  for(const row of refs.data??[]){
   const v=row.vendors as unknown as {display_name:string}|null;
   chefs.push({reference:row.reference,vendorId:row.vendor_id,chef:v?.display_name||"Chef",
    items:(lines.data??[]).filter(x=>x.vendor_id===row.vendor_id).map(x=>({
     name:x.dish_name_snapshot,quantity:x.quantity,unitPriceCents:x.unit_price_cents,lineTotalCents:x.line_total_cents,options:x.option_snapshot,note:x.dish_note||""
    }))});
  }
 }
 return NextResponse.json({id:data.id,paymentStatus:data.payment_status,status:data.status,paidAt:data.paid_at,
  event:data.payment_status==="paid"?data.events:null,
  masterReference:data.payment_status==="paid"?data.master_order_reference:null,
  totalCents:data.payment_status==="paid"?data.subtotal_cents:null,
  chefOrders:chefs},{headers:{"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}