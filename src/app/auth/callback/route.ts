import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function GET(req:Request){
 const {searchParams,origin}=new URL(req.url);
 const code=searchParams.get("code");
 if(!code)return NextResponse.redirect(new URL("/sign-in?error=auth",origin));
 const db=await createSupabaseServerClient();
 const {error}=await db.auth.exchangeCodeForSession(code);
 if(error)return NextResponse.redirect(new URL("/sign-in?error=auth",origin));
 return NextResponse.redirect(new URL("/auth/role-redirect",origin));
}