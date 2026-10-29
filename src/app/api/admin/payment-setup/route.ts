import {NextResponse} from "next/server";
import {createSupabaseServerClient} from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export async function GET(req:Request){
 const db=await createSupabaseServerClient();const {data:{user}}=await db.auth.getUser();
 if(!user)return NextResponse.json({error:"Sign-in required"},{status:401});
 const {data:admin}=await db.from("site_admins").select("user_id").eq("user_id",user.id).maybeSingle();
 if(!admin)return NextResponse.json({error:"Admin only"},{status:403});
 const checks={liveMerchantAccount:process.env.VERCEL_ENV!=="production"||(/^acct_[A-Za-z0-9]+$/.test(process.env.STRIPE_LIVE_ACCOUNT_ID??"")&&/^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY??"")),stripeSecret:!!process.env.STRIPE_SECRET_KEY,webhookSecret:!!process.env.STRIPE_WEBHOOK_SECRET,serverDatabase:!!process.env.SUPABASE_SERVICE_ROLE_KEY,ticketVerifier:!!process.env.TICKET_HASH_PEPPER,paymentsEnabled:process.env.CHECKOUT_ENABLED==="true",siteUrl:!!process.env.NEXT_PUBLIC_SITE_URL};
 return NextResponse.json({checks,ready:Object.values(checks).every(Boolean),webhookPath:"/api/stripe/webhook",mode:process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")?"test":process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")?"live":"not configured"},{headers:{"Cache-Control":"no-store"}});
}
