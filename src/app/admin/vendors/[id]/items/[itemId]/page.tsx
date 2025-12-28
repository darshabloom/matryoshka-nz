import { redirect } from "next/navigation";
import { createSupabaseServerReadonlyClient } from "@/lib/supabase/server-readonly";
import MenuItemEditor from "@/components/admin/MenuItemEditor";

export default async function AdminMenuItemPage({
    params,
}: {
    params: Promise<{ id: string; itemId: string }>;
}) {
    const { id: vendorId, itemId } = await params;

    const supabase = await createSupabaseServerReadonlyClient();

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) redirect("/login");

    const { data: item, error } = await supabase
        .from("menu_items")
        .select(
            `
            id,
            vendor_id,
            price_cents,
            is_active,
            sort_order,
            menu_item_translations (
                lang,
                name,
                description
            )
            `
        )
        .eq("id", itemId)
        .maybeSingle();

    if (error || !item || item.vendor_id !== vendorId) {
        return (
            <main style={{ padding: 24 }}>
                <h1>Menu item not found</h1>
            </main>
        );
    }

    const tr: any = { en: null, ru: null };
    (item as any).menu_item_translations?.forEach((t: any) => {
        tr[t.lang] = t;
    });

    return (
        <main style={{ maxWidth: 900, margin: "60px auto", padding: 24 }}>
            <h1>Edit menu item</h1>

            <p style={{ opacity: 0.8 }}>Item id: {itemId}</p>

            <p>
                <b>Price:</b> ${(item.price_cents / 100).toFixed(2)} | <b>Status:</b>{" "}
                {item.is_active ? "Active" : "Inactive"}
            </p>

            {/* <hr style={{ margin: "24px 0" }} /> */}

            {/* <h2>Current text</h2>
            <div style={{ display: "grid", gap: 12 }}>
                <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
                    <b>EN</b>
                    <div>
                        <b>Name:</b> {tr.en?.name ?? "—"}
                    </div>
                    <div>
                        <b>Description:</b> {tr.en?.description ?? "—"}
                    </div>
                </div>

                <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
                    <b>RU</b>
                    <div>
                        <b>Name:</b> {tr.ru?.name ?? "—"}
                    </div>
                    <div>
                        <b>Description:</b> {tr.ru?.description ?? "—"}
                    </div>
                </div>
            </div> */}

            <hr style={{ margin: "24px 0" }} />

            <MenuItemEditor
                itemId={itemId}
                vendorId={vendorId}
                initialPriceCents={item.price_cents}
                initialActive={item.is_active}
                initialEn={{
                    name: tr.en?.name ?? "",
                    description: tr.en?.description ?? "",
                }}
                initialRu={{
                    name: tr.ru?.name ?? "",
                    description: tr.ru?.description ?? "",
                }}
            />


            <p>
                <a href={`/admin/vendors/${vendorId}`} style={{ textDecoration: "underline" }}>
                    Back to vendor
                </a>
            </p>
        </main>
    );
}
