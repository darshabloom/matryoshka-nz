import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerReadonlyClient } from "@/lib/supabase/server-readonly";
import { listVendorsForAdmin } from "@/lib/admin/vendors";

export default async function AdminPage() {
    const supabase = await createSupabaseServerReadonlyClient();
    const { data } = await supabase.auth.getUser();
    const vendors = await listVendorsForAdmin();
    console.log("ADMIN vendors count:", vendors.length);


    if (!data.user) {
        redirect("/login");
    }

    return (
        <main style={{ maxWidth: 900, margin: "60px auto", padding: 24 }}>
            <h1 style={{ fontSize: 28, marginBottom: 8 }}>Admin</h1>
            <p style={{ opacity: 0.8, marginBottom: 20 }}>
                Logged in as {data.user.email}
            </p>

            <div style={{ display: "flex", gap: 12 }}>
                <Link href="/" style={{ textDecoration: "underline" }}>
                    Back to site
                </Link>
            </div>

            <hr style={{ margin: "24px 0" }} />

            <h2 style={{ marginBottom: 12 }}>Vendors</h2>

            {/* <ul style={{ display: "grid", gap: 8 }}>
                {vendors.map((v) => (
                    <li
                        key={v.id}
                        style={{
                            padding: 12,
                            border: "1px solid #ddd",
                            borderRadius: 8,
                        }}
                    >
                        <strong>{v.display_name}</strong>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>
                            /chef/{v.slug}
                        </div>
                    </li>
                ))}
            </ul> */}

            {vendors.length === 0 ? (
                <p style={{ opacity: 0.7 }}>No vendors returned from DB (yet).</p>
            ) : (
                <ul style={{ display: "grid", gap: 8 }}>
                    {vendors.map((v) => (
                        <li
                            key={v.id}
                            style={{
                                padding: 12,
                                border: "1px solid #ddd",
                                borderRadius: 8,
                            }}
                        >
                            <a
                                href={`/admin/vendors/${v.id}`}
                                style={{ textDecoration: "none", color: "inherit" }}
                            >
                                <strong>{v.display_name}</strong>
                                <div style={{ fontSize: 12, opacity: 0.7 }}>
                                    /chef/{v.slug}
                                </div>
                            </a>

                        </li>
                    ))}
                </ul>
            )}


        </main>
    );
}
