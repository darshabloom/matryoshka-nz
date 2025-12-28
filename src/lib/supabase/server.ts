import { createServerClient } from "@supabase/ssr";
import { cookies as nextCookies } from "next/headers";

export async function createSupabaseServerClient() {
    let cookieStore: any;

    // cookies() can throw (build-time / wrong context), so fall back safely.
    try {
        cookieStore = await nextCookies();
    } catch {
        cookieStore = null;
    }

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    if (cookieStore && typeof cookieStore.getAll === "function") {
                        return cookieStore.getAll();
                    }
                    return [];
                },
                setAll(cookiesToSet) {
                    // Only works in contexts where cookieStore.set exists and is allowed.
                    if (!cookieStore || typeof cookieStore.set !== "function") return;

                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options);
                        });
                    } catch {
                        // ignore - Next blocks cookie mutation outside Route Handlers / Server Actions
                    }
                },
            },
        }
    );
}
