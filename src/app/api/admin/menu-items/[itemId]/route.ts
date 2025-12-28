import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ itemId: string }> }
) {
    const { itemId } = await params;

    const supabase = await createSupabaseServerClient();

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
        return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const body = await req.json();

    // Expecting:
    // { price_cents: number, is_active: boolean, en: {name, description}, ru: {name, description} }
    const price_cents = Number(body.price_cents);
    const is_active = Boolean(body.is_active);

    if (!Number.isFinite(price_cents) || price_cents < 0) {
        return NextResponse.json({ error: "Invalid price_cents" }, { status: 400 });
    }

    // 1) Update menu_items
    const { error: itemErr } = await supabase
        .from("menu_items")
        .update({ price_cents, is_active, updated_at: new Date().toISOString() })
        .eq("id", itemId);

    if (itemErr) {
        return NextResponse.json({ error: itemErr.message }, { status: 400 });
    }

    // 2) Upsert translations (EN + RU)
    const rows = ["en", "ru"].map((lang) => ({
        menu_item_id: itemId,
        lang,
        name: body?.[lang]?.name ?? "",
        description: body?.[lang]?.description ?? null,
    }));

    const { error: trErr } = await supabase
        .from("menu_item_translations")
        .upsert(rows, { onConflict: "menu_item_id,lang" });

    if (trErr) {
        return NextResponse.json({ error: trErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
}
