import { getChefBySlug, listChefs } from "@/lib/data/chefs";
import ChefTemplate from "@/components/ChefTemplate/ChefTemplate";

export async function generateStaticParams() {
    const all = await listChefs({ lang: "en", q: "", area: "all", cuisine: "all" });
    return all.map((chef) => ({ slug: chef.slug }));
}

export default async function ChefPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const chef = await getChefBySlug(slug);

    if (!chef) {
        const known = await listChefs({ lang: "en", q: "", area: "all", cuisine: "all" });
        return (
            <main style={{ padding: 24 }}>
                <h1>Chef not found</h1>
                <p>
                    <b>slug:</b> {slug}
                </p>
                <p>
                    <b>known slugs:</b> {known.map((c) => c.slug).join(", ")}
                </p>
            </main>
        );
    }

    return <ChefTemplate {...chef} />;
}
