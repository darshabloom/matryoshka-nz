import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {serviceClient,isCheckoutConfigured,isTestCheckoutAllowed,checkTicket,verifyStripeMerchantAccount} from "@/lib/server/checkout-security";
import {POST as validateQuote} from "../quote/route";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(req:Request){
 if(!isCheckoutConfigured())return NextResponse.json({error:"Secure checkout is being configured. No payment has been taken."},{status:503});
 let body:any;try{body=await req.json()}catch{return NextResponse.json({error:"Invalid request"},{status:400})}
 const email=typeof body.email==="string"?body.email.trim().toLowerCase():"";
 if(process.env.CHECKOUT_ENABLED!=="true"){
  const auth=await createSupabaseServerClient();
  const {data:{user}}=await auth.auth.getUser();
  if(!isTestCheckoutAllowed(email,user?.email))return NextResponse.json({error:"Checkout is not open for this account. No payment has been taken."},{status:403});
 }
 const phone=typeof body.phone==="string"?body.phone.trim():"";
 if(phone.length<6||phone.length>32||!/^\+?[\d\s().-]+$/.test(phone))return NextResponse.json({error:"Enter a valid contact phone number"},{status:400});
 if(email.length<6||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return NextResponse.json({error:"Enter a valid booking email address"},{status:400});
 if(!UUID.test(body.idempotencyKey??"")||!UUID.test(body.eventId??""))return NextResponse.json({error:"Invalid checkout session"},{status:400});
 if(body.allergyDeclaration!=="none"&&body.allergyDeclaration!=="declared")return NextResponse.json({error:"Please complete the allergy declaration"},{status:400});
 if(body.allergyDeclaration==="declared"&&(typeof body.allergyDetails!=="string"||!body.allergyDetails.trim()||body.allergyDetails.length>2000))return NextResponse.json({error:"Please describe the allergy for the kitchen."},{status:400});
 if(!Array.isArray(body.items)||body.items.length>40||body.items.length<1||
    body.items.some((item:unknown)=>{
      if(!item||typeof item!=="object")return true;
      const line=item as {note?:unknown};
      return line.note!==undefined&&(typeof line.note!=="string"||line.note.length>300);
    }))
  return NextResponse.json({error:"Each dish note must be 300 characters or fewer"},{status:400});
 const specialRequests=typeof body.specialRequests==="string"?body.specialRequests.trim():"";
 if(specialRequests.length>500)return NextResponse.json({error:"Please keep comments under 500 characters"},{status:400});
 const quoteResponse=await validateQuote(new Request(req.url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({eventId:body.eventId,items:body.items})}));
 const quote=await quoteResponse.json();if(!quoteResponse.ok)return NextResponse.json({error:quote.error||"Your basket needs updating"},{status:quoteResponse.status});
 const service=serviceClient();let bookingId:null|string=null;
 // All event food orders require a verified event ticket; browsing stays public.
 {
  if(typeof body.ticketReference!=="string")return NextResponse.json({error:"A valid event ticket is required"},{status:400});
  try{bookingId=await checkTicket(service,body.eventId,email,body.ticketReference)}catch{return NextResponse.json({error:"Ticket verification is temporarily unavailable"},{status:503})}
  if(!bookingId)return NextResponse.json({error:"Unable to verify this event ticket and booking email. Check your confirmation details."},{status:403});
 }
 try{await verifyStripeMerchantAccount()}catch{return NextResponse.json({error:"The approved Stripe merchant account is not ready. No payment has been taken."},{status:503})}
 const supabase=await createSupabaseServerClient();const {data:{user}}=await supabase.auth.getUser();
 const restrictedTest=process.env.CHECKOUT_ENABLED!=="true"&&isTestCheckoutAllowed(email,user?.email)&&body.eventId==="3b7d5371-926e-408b-a4b7-af69f27b42cf"&&body.items.length===1&&body.items[0]?.dishId==="7f0f8639-dd8c-4aae-963a-a8bea61bced0"&&body.items[0]?.quantity===1;
 const {data:orderId,error:reserveError}=await service.rpc(restrictedTest?"reserve_restricted_test_food_order":"reserve_food_order",{
  p_event_id:body.eventId,p_user_id:user?.id??null,p_email:email,p_booking_id:bookingId,
  p_allergy_declaration:body.allergyDeclaration,p_allergy_details:body.allergyDeclaration==="declared"?body.allergyDetails.trim():"",p_special_requests:specialRequests,
  p_items:body.items,p_idempotency_key:body.idempotencyKey
 });
 if(reserveError||!orderId)return NextResponse.json({error:"Could not reserve this order. Please review availability and try again."},{status:409});
 const {error:phoneError}=await service.from("food_orders").update({contact_phone:phone}).eq("id",orderId).eq("email",email).eq("status","pending_payment");
 if(phoneError)return NextResponse.json({error:"Could not save the contact phone number. No payment was started."},{status:503});
 const {data:existing}=await service.from("food_orders").select("id,stripe_session_id,payment_status,subtotal_cents").eq("id",orderId).single();
 if(existing?.payment_status==="paid")return NextResponse.json({error:"This order has already been paid"},{status:409});
 const secret=process.env.STRIPE_SECRET_KEY!;
 async function retrieveStripe(id:string){
  const response=await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${secret}`},cache:"no-store"});
  if(!response.ok)throw Error("Unable to retrieve payment session");
  return response.json();
 }
 if(existing?.stripe_session_id){
  try{const session=await retrieveStripe(existing.stripe_session_id);if(session.status==="open"&&session.url)return NextResponse.json({url:session.url,orderId})}catch{}
  return NextResponse.json({error:"Payment session already exists. Please start a new checkout attempt."},{status:409});
 }
 const {data:lines,error:lineError}=await service.from("food_order_lines").select("dish_name_snapshot,option_snapshot,unit_price_cents,quantity").eq("order_id",orderId);
 if(lineError||!lines?.length)return NextResponse.json({error:"Unable to prepare your payment"},{status:503});
 const origin=process.env.NEXT_PUBLIC_SITE_URL||new URL(req.url).origin;
 if(!origin.startsWith("https://"))return NextResponse.json({error:"Secure payment URL is not configured"},{status:503});
 const form=new URLSearchParams();
 form.set("mode","payment");form.set("customer_email",email);form.set("client_reference_id",orderId);
 form.set("payment_method_types[0]","card");form.set("metadata[order_id]",orderId);form.set("metadata[site]","matryoshka");form.set("metadata[payment_kind]","food_order");
 // Preserve the food-order identity on the underlying Stripe payment too.
 form.set("payment_intent_data[metadata][site]","matryoshka");
 form.set("payment_intent_data[metadata][payment_kind]","food_order");
 form.set("payment_intent_data[metadata][order_id]",orderId);
 // Stock reservations stay pending for 30 minutes. Avoid Stripe's default 24-hour
 // Checkout lifetime: the payment window must stay close to the stock hold.
 form.set("expires_at",String(Math.floor(Date.now()/1000)+30*60+5));
 // Hosted Stripe payment is external for PCI safety, but returns to the
 // food menu with the order-result drawer open instead of a new page.
 const returnToMenu=`${origin}/events/${encodeURIComponent(quote.event.slug)}`;
 form.set("success_url",`${returnToMenu}?cart_status={CHECKOUT_SESSION_ID}`);
 form.set("cancel_url",`${returnToMenu}?cart_open=1`);
 for(const [i,line] of lines.entries()){
  form.set(`line_items[${i}][price_data][currency]`,"nzd");
  form.set(`line_items[${i}][price_data][unit_amount]`,String(line.unit_price_cents));
  form.set(`line_items[${i}][price_data][product_data][name]`,line.dish_name_snapshot.slice(0,100));
  form.set(`line_items[${i}][quantity]`,String(line.quantity));
 }
 try{
  const result=await fetch("https://api.stripe.com/v1/checkout/sessions",{method:"POST",headers:{"Authorization":`Bearer ${secret}`,"Content-Type":"application/x-www-form-urlencoded","Idempotency-Key":`matryoshka-${orderId}`},body:form.toString(),cache:"no-store"});
  const session=await result.json();
  if(!result.ok||typeof session.url!=="string"||!session.url.startsWith("https://checkout.stripe.com/"))return NextResponse.json({error:"Stripe could not start payment. Please try again."},{status:502});
  const {error:saveError}=await service.from("food_orders").update({stripe_session_id:session.id}).eq("id",orderId).eq("status","pending_payment");
  if(saveError)return NextResponse.json({error:"Unable to secure payment session. Please contact support."},{status:503});
  return NextResponse.json({url:session.url,orderId});
 }catch{return NextResponse.json({error:"Unable to reach Stripe securely. Please try again."},{status:502})}
}
