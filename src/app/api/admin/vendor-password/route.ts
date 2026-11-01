import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: sessionError } = await supabase.auth.getUser();
  if (sessionError || !user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { data: admin } = await supabase.from("site_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  let body: { vendorId?: string; email?: string; password?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const email = body.email?.trim().toLowerCase();
  if (!body.vendorId || !email || !body.password || body.password.length < 12 || body.password.length > 128)
    return NextResponse.json({ error: "Select a chef and provide an email and password of 12–128 characters." }, { status: 400 });

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) return NextResponse.json({ error: "Server configuration unavailable." }, { status: 503 });
  const service = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: linked, error: linkedError } = await service.from("vendor_users").select("user_id").eq("vendor_id", body.vendorId);
  if (linkedError) return NextResponse.json({ error: "Unable to validate chef membership." }, { status: 500 });
  const ids = new Set((linked ?? []).map(x => x.user_id));
  if (!ids.size) return NextResponse.json({ error: "Link the chef's Google account first." }, { status: 400 });
  const { data: users, error: userError } = await service.auth.admin.listUsers({ perPage: 1000 });
  if (userError) return NextResponse.json({ error: "Unable to load users." }, { status: 500 });
  const target = users.users.find(x => ids.has(x.id) && x.email?.toLowerCase() === email);
  if (!target) return NextResponse.json({ error: "That email is not linked to this chef. No changes made." }, { status: 404 });
  const { error } = await service.auth.admin.updateUserById(target.id, { password: body.password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
