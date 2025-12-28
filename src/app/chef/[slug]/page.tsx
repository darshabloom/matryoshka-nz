import { chefs } from "@/data/chefs";
import ChefTemplate from "@/components/ChefTemplate/ChefTemplate";

export function generateStaticParams() {
    return chefs.map((chef) => ({ slug: chef.slug }));
}

export default async function ChefPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const chef = chefs.find((c) => c.slug === slug);

    if (!chef) {
        return (
            <main style={{ padding: 24 }}>
                <h1>Chef not found</h1>
                <p>
                    <b>slug:</b> {slug}
                </p>
                <p>
                    <b>known slugs:</b> {chefs.map((c) => c.slug).join(", ")}
                </p>
            </main>
        );
    }

    return <ChefTemplate {...chef} />;
}
