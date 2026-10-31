import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase/server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 const db=await createSupabaseServerClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:"Sign in required"},{status:401});
 const {data:admin}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(!admin)return NextResponse.json({error:"Admin only"},{status:403});
 const secret=process.env.STRIPE_SECRET_KEY;
 const expected=process.env.STRIPE_LIVE_ACCOUNT_ID;
 const checks:{
  liveStripeKey:boolean;merchantMatched:boolean;webhookConfigured:boolean;ticketVerificationConfigured:boolean;
  senderConfigured:boolean;emailsEnabled:boolean;checkoutEnabled:boolean;details:string
 }={liveStripeKey:!!secret&&/^(sk|rk)_live_/.test(secret),merchantMatched:false,
   webhookConfigured:!!process.env.STRIPE_WEBHOOK_SECRET,
   ticketVerificationConfigured:!!process.env.TICKET_HASH_PEPPER&&!!process.env.CROSS_SITE_TICKET_VERIFY_SECRET,
   senderConfigured:!!process.env.RESEND_API_KEY&&process.env.FOOD_ORDER_FROM_EMAIL==="orders@matryoshka.nz"&&process.env.FOOD_ORDER_ADMIN_EMAIL==="nzmatryoshka@gmail.com",
   emailsEnabled:process.env.FOOD_ORDER_EMAILS_ENABLED==="true",
   checkoutEnabled:process.env.CHECKOUT_ENABLED==="true",
   details:"Checks configuration only; no charge or email sent."};
 if(checks.liveStripeKey&&expected){
  try{
   const r=await fetch("https://api.stripe.com/v1/account",{headers:{Authorization:"Bearer "+secret},cache:"no-store",signal:AbortSignal.timeout(8000)});
   if(r.ok){const account=await r.json() as {id?:string};checks.merchantMatched=account.id===expected;}
  }catch{}
 }
 return NextResponse.json(checks,{headers:{"Cache-Control":"no-store"}});
}
