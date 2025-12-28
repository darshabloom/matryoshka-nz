import { redirect } from "next/navigation";
import { createSupabaseServerReadonlyClient } from "@/lib/supabase/server-readonly";

export default async function AdminVendorPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const supabase = await createSupabaseServerReadonlyClient();

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) redirect("/login");

    const { data: vendor, error } = await supabase
        .from("vendors")
        .select(`
            id,
            slug,
            display_name,
            area_code,
            fulfilment,
            vendor_translations (
                lang,
                tagline,
                description,
                about
            ),
            menu_items (
                id,
                price_cents,
                is_active,
                sort_order,
                menu_item_translations (
                    lang,
                    name,
                    description
                )
            )
        `)

        .eq("id", id)
        .maybeSingle();

    const pick = (arr: any[], lang: "en" | "ru") =>
        arr?.find((x) => x.lang === lang) ?? null;


    if (error || !vendor) {
        return (
            <main style={{ padding: 24 }}>
                <h1>Vendor not found</h1>
                <p style={{ opacity: 0.7 }}>id: {id}</p>
            </main>
        );
    }

    return (
        <main style={{ maxWidth: 900, margin: "60px auto", padding: 24 }}>
            <h1>{vendor.display_name}</h1>

            <p>
                <b>Slug:</b> {vendor.slug}
            </p>

            <p>
                <b>Area:</b> {vendor.area_code ?? "—"}
            </p>

            <p>
                <b>Fulfilment:</b> {vendor.fulfilment?.join(", ") ?? "—"}
            </p>

            <hr style={{ margin: "24px 0" }} />

            <h2>Menu items</h2>

            {(vendor as any).menu_items?.length ? (
                <div style={{ display: "grid", gap: 12 }}>
                    {(vendor as any).menu_items
                        .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                        .map((item: any) => {
                            const en = pick(item.menu_item_translations, "en");
                            const ru = pick(item.menu_item_translations, "ru");

                            return (
                                <a
                                    key={item.id}
                                    href={`/admin/vendors/${(vendor as any).id}/items/${item.id}`}
                                    style={{
                                        display: "block",
                                        padding: 12,
                                        border: "1px solid #ddd",
                                        borderRadius: 10,
                                        textDecoration: "none",
                                        color: "inherit",
                                    }}
                                >

                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                                        <div>
                                            <div>
                                                <b>EN:</b> {en?.name ?? "—"}
                                            </div>
                                            <div style={{ opacity: 0.8 }}>
                                                <b>RU:</b> {ru?.name ?? "—"}
                                            </div>
                                        </div>

                                        <div style={{ textAlign: "right" }}>
                                            <div>
                                                <b>${(item.price_cents / 100).toFixed(2)}</b>
                                            </div>
                                            <div style={{ fontSize: 12, opacity: 0.7 }}>
                                                {item.is_active ? "Active" : "Inactive"}
                                            </div>
                                        </div>
                                    </div>

                                    {(en?.description || ru?.description) ? (
                                        <div style={{ marginTop: 8, fontSize: 14, opacity: 0.9 }}>
                                            {en?.description ? (
                                                <div>
                                                    <b>EN desc:</b> {en.description}
                                                </div>
                                            ) : null}
                                            {ru?.description ? (
                                                <div>
                                                    <b>RU desc:</b> {ru.description}
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </a>
                            );
                        })}
                </div>
            ) : (
                <p style={{ opacity: 0.7 }}>No menu items yet.</p>
            )}

            <hr style={{ margin: "24px 0" }} />

            <h2>Translations</h2>


            {(vendor as any).vendor_translations?.length ? (
                (vendor as any).vendor_translations.map((t: any) => (
                    <div key={t.lang} style={{ marginBottom: 16 }}>
                        <h3>{String(t.lang).toUpperCase()}</h3>
                        <p>
                            <b>Tagline:</b> {t.tagline ?? "—"}
                        </p>
                        <p>
                            <b>Description:</b> {t.description ?? "—"}
                        </p>
                        <p>
                            <b>About:</b> {t.about ?? "—"}
                        </p>
                    </div>
                ))
            ) : (
                <p style={{ opacity: 0.7 }}>No translations found.</p>
            )}
        </main>
    );
}
