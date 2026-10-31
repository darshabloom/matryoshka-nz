import {serviceClient} from "@/lib/server/checkout-security";

type Delivery={id:string;order_id:string;recipient_kind:"customer"|"chef"|"admin";
 vendor_id:string|null;recipient_user_id:string|null;attempts:number};
type FoodLine={vendor_id:string;dish_name_snapshot:string;quantity:number;
 option_snapshot:unknown;dish_note:string|null};
const htmlSafe=(value:unknown)=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]??c));
function linesHtml(lines:FoodLine[]){
 return lines.map(x=>`<li><strong>${x.quantity} × ${htmlSafe(x.dish_name_snapshot)}</strong>${x.dish_note?.trim()?`<p>Dish note: ${htmlSafe(x.dish_note)}</p>`:""}</li>`).join("");
}
/** Only send for paid orders. Each queue item has a persistent unique ID;
 * Resend idempotency key allows safe retries after network ambiguity.
 * Sender settings are deliberately required and never inferred.
 */
export async function dispatchPaidFoodEmails(orderId:string):Promise<{sent:number;skipped:number;failed:number}>{
 const result={sent:0,skipped:0,failed:0};
 const apiKey=process.env.RESEND_API_KEY,from=process.env.FOOD_ORDER_FROM_EMAIL;
 if(process.env.FOOD_ORDER_EMAILS_ENABLED!=="true"||!apiKey||!from)return {...result,skipped:1};
 const db=serviceClient();
 const {data:order,error}=await db.from("food_orders")
  .select("id,email,payment_status,master_order_reference,allergy_declaration,allergy_details,special_requests,subtotal_cents,events(title_en)")
  .eq("id",orderId).maybeSingle();
 if(error||!order||order.payment_status!=="paid"||!order.master_order_reference)return {...result,skipped:1};
 const [pending,linesResult,chefRefs]=await Promise.all([
  db.from("food_order_email_deliveries").select("id,order_id,recipient_kind,vendor_id,recipient_user_id,attempts")
   .eq("order_id",orderId).in("status",["pending","failed"]).lte("next_attempt_at",new Date().toISOString()).limit(80),
  db.from("food_order_lines").select("vendor_id,dish_name_snapshot,quantity,option_snapshot,dish_note").eq("order_id",orderId),
  db.from("food_order_chef_refs").select("vendor_id,reference,vendors(display_name)").eq("order_id",orderId)
 ]);
 if(pending.error||linesResult.error||chefRefs.error)throw Error("Failed loading paid order email queue");
 const allLines=(linesResult.data??[]) as FoodLine[];
 const refs=chefRefs.data??[];
 for(const d of (pending.data??[]) as Delivery[]){
  const {data:claim,error:claimError}=await db.from("food_order_email_deliveries")
   .update({status:"sending",attempts:d.attempts+1,updated_at:new Date().toISOString()})
   .eq("id",d.id).in("status",["pending","failed"])
   .select("id").maybeSingle();
  if(claimError||!claim){result.skipped++;continue;}
  let recipient:string|null=null;
  if(d.recipient_kind==="customer")recipient=order.email;
  else if(d.recipient_kind==="admin")recipient=process.env.FOOD_ORDER_ADMIN_EMAIL??null;
  else if(d.recipient_user_id){
   const user=await db.auth.admin.getUserById(d.recipient_user_id);
   recipient=user.data.user?.email??null;
  }
  if(!recipient||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)){
   await db.from("food_order_email_deliveries").update({status:"failed",last_error:"Recipient address missing or invalid",
    next_attempt_at:new Date(Date.now()+86400000).toISOString(),updated_at:new Date().toISOString()}).eq("id",d.id);
   result.failed++;continue;
  }
  const ownRef=refs.find(r=>r.vendor_id===d.vendor_id);
  if(d.recipient_kind==="chef"&&!ownRef){
   await db.from("food_order_email_deliveries").update({status:"failed",last_error:"Chef reference missing",updated_at:new Date().toISOString()}).eq("id",d.id);
   result.failed++;continue;
  }
  const selected=d.recipient_kind==="chef"?allLines.filter(x=>x.vendor_id===d.vendor_id):allLines;
  const chefDetails=refs.map(r=>{
   const vendor=r.vendors as unknown as {display_name:string}|null;
   return `<li><strong>${htmlSafe(r.reference)} — ${htmlSafe(vendor?.display_name||"Chef")}</strong><ul>${linesHtml(allLines.filter(x=>x.vendor_id===r.vendor_id))}</ul></li>`;
  }).join("");
  const allergies=order.allergy_declaration==="declared"?`<p><strong>ALLERGY DECLARED:</strong> ${htmlSafe(order.allergy_details)}</p>`:"<p>No allergies declared.</p>";
  const chefName=(ownRef?.vendors as unknown as {display_name:string}|null)?.display_name||"Chef";
  const title=d.recipient_kind==="chef"
   ?`Kitchen order ${ownRef!.reference} — ${order.master_order_reference}`
   :`Food order confirmed — ${order.master_order_reference}`;
  const body=`<div style="font:15px Arial,sans-serif;max-width:640px;color:#463028">
   <h1 style="color:#96352e">Matryoshka food order</h1>
   <p><strong>Master reference: ${htmlSafe(order.master_order_reference)}</strong></p>
   <p>${htmlSafe((order.events as unknown as {title_en:string}|null)?.title_en||"Event")}</p>
   ${d.recipient_kind==="chef"
    ?`<h2>${htmlSafe(ownRef!.reference)} — ${htmlSafe(chefName)}</h2><ul>${linesHtml(selected)}</ul>${allergies}<p><strong>General request:</strong> ${htmlSafe(order.special_requests||"None")}</p>`
    :`<h2>Chef orders</h2><ul>${chefDetails}</ul>${allergies}<p><strong>General request:</strong> ${htmlSafe(order.special_requests||"None")}</p>`}
   <p>Food is provided at the event. Please keep your food-order reference.</p>
   </div>`;
  try{
   const response=await fetch("https://api.resend.com/emails",{method:"POST",
    headers:{"Authorization":`Bearer ${apiKey}`,"Content-Type":"application/json","Idempotency-Key":d.id},
    body:JSON.stringify({from,to:[recipient],subject:title,html:body}),cache:"no-store",
    signal:AbortSignal.timeout(15000)});
   const data=await response.json().catch(()=>({})) as {id?:string;message?:string};
   if(!response.ok||!data.id)throw Error(`Email provider rejected request (${response.status}): ${String(data.message||"unknown").slice(0,120)}`);
   await db.from("food_order_email_deliveries").update({status:"sent",provider_message_id:data.id,
    sent_at:new Date().toISOString(),last_error:null,updated_at:new Date().toISOString()}).eq("id",d.id);
   result.sent++;
  }catch(e){
   await db.from("food_order_email_deliveries").update({status:"failed",
    last_error:e instanceof Error?e.message.slice(0,200):"Unknown delivery failure",
    next_attempt_at:new Date(Date.now()+Math.min(3600000,60000*Math.pow(2,Math.min(5,d.attempts)))).toISOString(),
    updated_at:new Date().toISOString()}).eq("id",d.id);
   result.failed++;
  }
 }
 return result;
}
