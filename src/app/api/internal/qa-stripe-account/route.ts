import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
export const runtime="nodejs";
// Temporary Preview-only QA. Never return credentials or Stripe account identifiers.
export async function GET(){
  if(process.env.VERCEL_ENV!=="preview"||process.env.VERCEL_GIT_COMMIT_REF!=="redesign/food-first-home"){
    return new Response(null,{status:404});
  }
  const key=process.env.STRIPE_SECRET_KEY??"";
  if(!key.startsWith("sk_test_")){
    return NextResponse.json({testKey:false,accountMatches:false,verification:"key-not-test"},{headers:{"Cache-Control":"no-store"}});
  }
  try{
    const res=await fetch("https://api.stripe.com/v1/account",{
      headers:{Authorization:`Bearer ${key}`},
      cache:"no-store",
      signal:AbortSignal.timeout(8000)
    });
    if(!res.ok)return NextResponse.json({testKey:true,accountMatches:false,verification:"stripe-api-error",httpStatus:res.status},{headers:{"Cache-Control":"no-store"}});
    const account=await res.json();
    return NextResponse.json({testKey:true,accountMatches:account.id==="acct_1SXo5CPIwTIma6Ev",verification:"stripe-account-checked"},{headers:{"Cache-Control":"no-store"}});
  }catch{return NextResponse.json({testKey:true,accountMatches:false,verification:"stripe-unreachable"},{headers:{"Cache-Control":"no-store"}})}
}
