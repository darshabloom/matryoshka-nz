import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
        return NextResponse.redirect(`${origin}/login`);
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options);
                    });
                },
            },
        }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(`${origin}/login?error=auth`);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(`${origin}/login`);
    const { data: admin } = await supabase.from("site_admins").select("user_id").eq("user_id", user.id).maybeSingle();
    if (admin) return NextResponse.redirect(`${origin}/admin`);
    const { data: membership } = await supabase.from("vendor_users").select("vendor_id, vendors(slug)").eq("user_id", user.id).limit(1).maybeSingle();
    const vendor = membership?.vendors as unknown as {slug:string}|null;
    if (vendor?.slug) return NextResponse.redirect(`${origin}/chef/${encodeURIComponent(vendor.slug)}`);
    return NextResponse.redirect(`${origin}/`);
}
