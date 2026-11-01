import {NextResponse} from "next/server";
import {isCheckoutConfigured,isTestCheckoutAllowed} from "@/lib/server/checkout-security";
import {createSupabaseServerClient} from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export async function GET(){
 const db=await createSupabaseServerClient();
 const {data:{user}}=await db.auth.getUser();
 const stripe=!!process.env.STRIPE_SECRET_KEY&&!!process.env.STRIPE_WEBHOOK_SECRET;
 const tickets=!!process.env.SUPABASE_SERVICE_ROLE_KEY&&!!process.env.TICKET_HASH_PEPPER;
 const testAllowed=!!user?.email&&isTestCheckoutAllowed(user.email,user.email);
 const enabled=isCheckoutConfigured()&&(process.env.CHECKOUT_ENABLED==="true"||testAllowed);
 return NextResponse.json({enabled,stripeReady:stripe,ticketVerificationReady:tickets,reason:enabled?null:"Secure checkout is being configured. No payment can be taken yet."},{headers:{"Cache-Control":"no-store"}});
}
