import { NextResponse } from "next/server";
import { listChefs } from "@/lib/data/chefs";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);

    const lang = (searchParams.get("lang") === "ru" ? "ru" : "en") as "en" | "ru";
    const q = searchParams.get("q") ?? "";
    const area = (searchParams.get("area") ?? "all") as any;
    const cuisine = (searchParams.get("cuisine") ?? "all") as any;

    const chefs = await listChefs({ lang, q, area, cuisine });

    return NextResponse.json({ chefs });
}
