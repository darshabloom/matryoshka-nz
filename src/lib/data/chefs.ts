import type {
    AreaCode,
    CuisineCode,
    Fulfilment,
    ListChefsInput,
    Vendor,
} from "@/lib/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// ---- helpers (keep small + explicit) ----
function toI18n(en?: string | null, ru?: string | null) {
    return { en: en ?? "", ru: ru ?? "" };
}

function toOptionalI18n(en?: string | null, ru?: string | null) {
    return en || ru ? { en: en ?? "", ru: ru ?? "" } : undefined;
}

function normaliseFulfilment(x: unknown): Fulfilment[] {
    if (!Array.isArray(x)) return [];
    return x.filter((v): v is Fulfilment => v === "pickup" || v === "delivery");
}

function normaliseArea(x: unknown): AreaCode | undefined {
    const allowed: AreaCode[] = [
        "central",
        "northshore",
        "west",
        "east",
        "south",
        "other",
    ];
    return typeof x === "string" && (allowed as string[]).includes(x) ? (x as AreaCode) : undefined;
}

function normaliseCuisines(list: unknown[]): CuisineCode[] {
    const allowed: CuisineCode[] = [
        "desserts",
        "russian",
        "european",
        "salads",
        "home_style",
    ];
    return list
        .filter((x): x is string => typeof x === "string")
        .filter((x): x is CuisineCode => (allowed as string[]).includes(x));
}

// ---- DAL ----

export async function listChefs(input: ListChefsInput): Promise<Vendor[]> {
    const supabase = await createSupabaseServerClient();

    const { data: vendors, error: vErr } = await supabase
        .from("vendors")
        .select("id, slug, display_name, area_code, fulfilment, instagram_handle, phone, hero_image_url")
        .order("display_name", { ascending: true });

    if (vErr) throw vErr;
    if (!vendors || vendors.length === 0) return [];

    const vendorIds = vendors.map((v) => v.id);

    const { data: vTrans, error: vtErr } = await supabase
        .from("vendor_translations")
        .select("vendor_id, lang, tagline, description, about")
        .in("vendor_id", vendorIds);

    if (vtErr) throw vtErr;

    const { data: vCuisines, error: vcErr } = await supabase
        .from("vendor_cuisines")
        .select("vendor_id, cuisine_code")
        .in("vendor_id", vendorIds);

    if (vcErr) throw vcErr;

    const { data: menuItems, error: miErr } = await supabase
        .from("menu_items")
        .select("id, vendor_id, price_cents, is_active, sort_order")
        .in("vendor_id", vendorIds)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

    if (miErr) throw miErr;

    const menuItemIds = (menuItems ?? []).map((m) => m.id);

    const { data: miTrans, error: mitErr } = await supabase
        .from("menu_item_translations")
        .select("menu_item_id, lang, name, description")
        .in("menu_item_id", menuItemIds);

    if (mitErr) throw mitErr;

    // ---- lookup maps ----
    const vendorTransMap = new Map<string, { en?: any; ru?: any }>();
    (vTrans ?? []).forEach((t) => {
        const cur = vendorTransMap.get(t.vendor_id) ?? {};
        cur[t.lang as "en" | "ru"] = t;
        vendorTransMap.set(t.vendor_id, cur);
    });

    const cuisineMap = new Map<string, string[]>();
    (vCuisines ?? []).forEach((c) => {
        cuisineMap.set(c.vendor_id, [...(cuisineMap.get(c.vendor_id) ?? []), c.cuisine_code]);
    });

    const menuMap = new Map<string, any[]>();
    (menuItems ?? []).forEach((m) => {
        menuMap.set(m.vendor_id, [...(menuMap.get(m.vendor_id) ?? []), m]);
    });

    const menuTransMap = new Map<string, { en?: any; ru?: any }>();
    (miTrans ?? []).forEach((t) => {
        const cur = menuTransMap.get(t.menu_item_id) ?? {};
        cur[t.lang as "en" | "ru"] = t;
        menuTransMap.set(t.menu_item_id, cur);
    });

    // ---- assemble ----
    let assembled: Vendor[] = vendors.map((v): Vendor => {
        const vt = vendorTransMap.get(v.id) ?? {};
        const cuisinesRaw = cuisineMap.get(v.id) ?? [];
        const cuisine = normaliseCuisines(cuisinesRaw);

        const items = (menuMap.get(v.id) ?? []).map((mi) => {
            const tr = menuTransMap.get(mi.id) ?? {};
            return {
                id: mi.id,
                price_cents: Number(mi.price_cents),
                name: toI18n(tr.en?.name, tr.ru?.name),
                description: toOptionalI18n(tr.en?.description, tr.ru?.description),
            };
        });

        return {
            slug: v.slug,
            name: v.display_name,

            area: normaliseArea(v.area_code),
            fulfilment: normaliseFulfilment(v.fulfilment),
            cuisine,

            tagline: toOptionalI18n(vt.en?.tagline, vt.ru?.tagline),
            description: toI18n(vt.en?.description, vt.ru?.description),
            about: toOptionalI18n(vt.en?.about, vt.ru?.about),

            instagram: v.instagram_handle ?? undefined,
            phone: v.phone ?? undefined,
            heroImage: v.hero_image_url ?? undefined,

            // location not in DB yet (you can add later)
            menu: items,
        };
    });

    // ---- filters/search ----
    const q = (input.q ?? "").trim().toLowerCase();
    const area = input.area ?? "all";
    const cuisine = input.cuisine ?? "all";

    assembled = assembled.filter((chef) => {
        if (area !== "all" && chef.area !== area) return false;
        if (cuisine !== "all" && !(chef.cuisine?.includes(cuisine))) return false;

        if (!q) return true;

        const parts: string[] = [
            chef.name,
            chef.description.en,
            chef.description.ru,
            chef.tagline?.en ?? "",
            chef.tagline?.ru ?? "",
            chef.about?.en ?? "",
            chef.about?.ru ?? "",
        ];

        chef.menu.forEach((item) => {
            parts.push(item.name.en, item.name.ru);
            if (item.description) parts.push(item.description.en, item.description.ru);
        });

        return parts.join(" ").toLowerCase().includes(q);
    });

    return assembled;
}

export async function getChefBySlug(slug: string): Promise<Vendor | null> {
    const supabase = await createSupabaseServerClient();

    const { data: v, error: vErr } = await supabase
        .from("vendors")
        .select("id, slug, display_name, area_code, fulfilment, instagram_handle, phone, hero_image_url")
        .eq("slug", slug)
        .maybeSingle();

    if (vErr) throw vErr;
    if (!v) return null;

    const vendorId = v.id;

    const { data: vTrans, error: vtErr } = await supabase
        .from("vendor_translations")
        .select("vendor_id, lang, tagline, description, about")
        .eq("vendor_id", vendorId);

    if (vtErr) throw vtErr;

    const { data: vCuisines, error: vcErr } = await supabase
        .from("vendor_cuisines")
        .select("vendor_id, cuisine_code")
        .eq("vendor_id", vendorId);

    if (vcErr) throw vcErr;

    const { data: menuItems, error: miErr } = await supabase
        .from("menu_items")
        .select("id, vendor_id, price_cents, is_active, sort_order")
        .eq("vendor_id", vendorId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

    if (miErr) throw miErr;

    const itemIds = (menuItems ?? []).map((m) => m.id);

    const { data: miTrans, error: mitErr } = await supabase
        .from("menu_item_translations")
        .select("menu_item_id, lang, name, description")
        .in("menu_item_id", itemIds);

    if (mitErr) throw mitErr;

    const vt: any = { en: {}, ru: {} };
    (vTrans ?? []).forEach((t) => (vt[t.lang] = t));

    const cuisinesRaw = (vCuisines ?? []).map((c) => c.cuisine_code);
    const cuisine = normaliseCuisines(cuisinesRaw);

    const transMap = new Map<string, { en?: any; ru?: any }>();
    (miTrans ?? []).forEach((t) => {
        const cur = transMap.get(t.menu_item_id) ?? {};
        cur[t.lang as "en" | "ru"] = t;
        transMap.set(t.menu_item_id, cur);
    });

    const items = (menuItems ?? []).map((mi) => {
        const tr = transMap.get(mi.id) ?? {};
        return {
            id: mi.id,
            price_cents: Number(mi.price_cents),
            name: toI18n(tr.en?.name, tr.ru?.name),
            description: toOptionalI18n(tr.en?.description, tr.ru?.description),
        };
    });

    return {
        slug: v.slug,
        name: v.display_name,

        area: normaliseArea(v.area_code),
        fulfilment: normaliseFulfilment(v.fulfilment),
        cuisine,

        tagline: toOptionalI18n(vt.en?.tagline, vt.ru?.tagline),
        description: toI18n(vt.en?.description, vt.ru?.description),
        about: toOptionalI18n(vt.en?.about, vt.ru?.about),

        instagram: v.instagram_handle ?? undefined,
        phone: v.phone ?? undefined,
        heroImage: v.hero_image_url ?? undefined,

        menu: items,
    };
}
