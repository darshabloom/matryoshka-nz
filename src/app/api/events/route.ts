import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Public event discovery. The database's RLS policy hides unpublished events.
 * An additional explicit publish/date filter prevents privileged authenticated
 * users from accidentally returning draft events in this public endpoint.
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("events")
      .select("id, slug, title_en, title_ru, description_en, description_ru, starts_at, ends_at, ordering_opens_at, ordering_closes_at, location_text, external_ticket_url, cover_image_url, gallery_image_urls")
      .eq("is_published", true)
      .gt("ends_at", new Date().toISOString())
      .order("starts_at", { ascending: true });
    if (error) {
      console.error("Unable to list events", error.message);
      return NextResponse.json({ error: "Unable to load events" }, { status: 500 });
    }
    return NextResponse.json({ events: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Unable to load events" }, { status: 500 });
  }
}
