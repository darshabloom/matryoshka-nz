import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function listVendorsForAdmin() {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from("vendors")
        .select("id, slug, display_name, created_at")
        .order("created_at", { ascending: true });

    if (error) throw error;
    return data ?? [];
}
