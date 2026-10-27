import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
export async function GET(){
 const stripe=!!process.env.STRIPE_SECRET_KEY&&!!process.env.STRIPE_WEBHOOK_SECRET;
 const tickets=!!process.env.SUPABASE_SERVICE_ROLE_KEY&&!!process.env.TICKET_HASH_PEPPER;
 const enabled=process.env.CHECKOUT_ENABLED==="true"&&stripe&&tickets;
 return NextResponse.json({enabled,stripeReady:stripe,ticketVerificationReady:tickets,reason:enabled?null:"Secure checkout is being configured. No payment can be taken yet."},{headers:{"Cache-Control":"no-store"}});
}
