"use client";

import { useMemo, useState } from "react";

type Tr = { name: string; description: string };
type Props = {
    itemId: string;
    vendorId: string;
    initialPriceCents: number;
    initialActive: boolean;
    initialEn: Tr;
    initialRu: Tr;
};

const SITE_MARKUP_RATE = 0.10; // 10%

function centsToDollars(cents: number) {
    return (cents / 100).toFixed(2);
}

function dollarsToCents(dollarsStr: string) {
    const n = Number(dollarsStr);
    if (!Number.isFinite(n)) return NaN;
    return Math.round(n * 100);
}

function applyMarkupCents(baseCents: number) {
    return Math.round(baseCents * (1 + SITE_MARKUP_RATE));
}

function formatRate(rate: number) {
    return `${Math.round(rate * 100)}%`;
}

export default function MenuItemEditor({
    itemId,
    vendorId,
    initialPriceCents,
    initialActive,
    initialEn,
    initialRu,
}: Props) {
    const [priceStr, setPriceStr] = useState(centsToDollars(initialPriceCents));
    const [isActive, setIsActive] = useState(initialActive);

    const [enName, setEnName] = useState(initialEn.name);
    const [enDesc, setEnDesc] = useState(initialEn.description);

    const [ruName, setRuName] = useState(initialRu.name);
    const [ruDesc, setRuDesc] = useState(initialRu.description);

    const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const [error, setError] = useState("");

    const priceCents = useMemo(() => dollarsToCents(priceStr), [priceStr]);

    async function save() {
        setStatus("saving");
        setError("");

        if (!Number.isFinite(priceCents) || priceCents < 0) {
            setStatus("error");
            setError("Price must be a valid number (0 or more).");
            return;
        }

        const res = await fetch(`/api/admin/menu-items/${itemId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                price_cents: priceCents,
                is_active: isActive,
                en: { name: enName, description: enDesc || null },
                ru: { name: ruName, description: ruDesc || null },
            }),
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setStatus("error");
            setError(data?.error || "Save failed");
            return;
        }

        setStatus("saved");
        setTimeout(() => setStatus("idle"), 1200);
    }

    return (
        <section style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gap: 8, maxWidth: 280 }}>
                <div>
                    <b>Price (NZD)</b>

                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
                        <input
                            value={priceStr}
                            onChange={(e) => setPriceStr(e.target.value)}
                            inputMode="decimal"
                            style={{ width: 160, padding: 10, border: "1px solid #ddd", borderRadius: 10 }}
                        />

                        <div style={{ fontSize: 14, opacity: 0.85 }}>
                            <b>Site price (+{formatRate(SITE_MARKUP_RATE)}):</b>{" "}
                            {Number.isFinite(priceCents) && priceCents >= 0
                                ? `$${(applyMarkupCents(priceCents) / 100).toFixed(2)}`
                                : "—"}
                        </div>
                    </div>
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                    />
                    <span><b>Active</b></span>
                </label>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
                <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
                    <h3 style={{ marginTop: 0 }}>EN</h3>
                    <label>
                        <b>Name</b>
                        <input
                            value={enName}
                            onChange={(e) => setEnName(e.target.value)}
                            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 10 }}
                        />
                    </label>
                    <div style={{ height: 10 }} />
                    <label>
                        <b>Description</b>
                        <textarea
                            value={enDesc}
                            onChange={(e) => setEnDesc(e.target.value)}
                            rows={3}
                            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 10 }}
                        />
                    </label>
                </div>

                <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
                    <h3 style={{ marginTop: 0 }}>RU</h3>
                    <label>
                        <b>Name</b>
                        <input
                            value={ruName}
                            onChange={(e) => setRuName(e.target.value)}
                            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 10 }}
                        />
                    </label>
                    <div style={{ height: 10 }} />
                    <label>
                        <b>Description</b>
                        <textarea
                            value={ruDesc}
                            onChange={(e) => setRuDesc(e.target.value)}
                            rows={3}
                            style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 10 }}
                        />
                    </label>
                </div>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button
                    onClick={save}
                    disabled={status === "saving"}
                    style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid #111",
                        background: "#111",
                        color: "#fff",
                        cursor: "pointer",
                    }}
                >
                    {status === "saving" ? "Saving..." : "Save"}
                </button>

                {/* <a href={`/admin/vendors/${vendorId}`} style={{ textDecoration: "underline" }}>
                    Back to vendor
                </a> */}

                {status === "saved" ? <span style={{ color: "green" }}>Saved</span> : null}
                {status === "error" ? <span style={{ color: "crimson" }}>{error}</span> : null}
            </div>
        </section>
    );
}
