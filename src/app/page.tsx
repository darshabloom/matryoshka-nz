"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { t } from "@/components/i18n/t";
import type { AreaCode, CuisineCode, Vendor } from "@/lib/types";
import { areaLabels, cuisineLabels } from "@/lib/labels";

export default function HomePage() {
  const { lang } = useLanguage();
  const ui = t(lang);

  const [chefs, setChefs] = useState<Vendor[]>([]);
  const [q, setQ] = useState("");
  const [area, setArea] = useState<AreaCode | "all">("all");
  const [cuisine, setCuisine] = useState<CuisineCode | "all">("all");

  useEffect(() => {
    const controller = new AbortController();

    async function run() {
      const params = new URLSearchParams({
        lang,
        q,
        area,
        cuisine,
      });

      const res = await fetch(`/api/chefs?${params.toString()}`, {
        signal: controller.signal,
      });

      const json = await res.json();
      setChefs(json.chefs);
    }

    run().catch(() => { });
    return () => controller.abort();
  }, [lang, q, area, cuisine]);

  const allAreas = useMemo(() => {
    const set = new Set<AreaCode>();
    chefs.forEach((c) => {
      if (c.area) set.add(c.area);
    });
    return Array.from(set);
  }, [chefs]);


  const allCuisines = useMemo(() => {
    const set = new Set<CuisineCode>();
    chefs.forEach((c) => {
      c.cuisine?.forEach((x) => set.add(x));
    });
    return Array.from(set);
  }, [chefs]);




  const filtered = chefs;


  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>{ui.homeTitle}</h1>
        <p className={styles.subtitle}>{ui.homeSubtitle}</p>

        <div className={styles.filters}>
          <input
            className={styles.search}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={ui.searchPlaceholder}
          />

          <select className={styles.select} value={area} onChange={(e) => setArea(e.target.value as any)}>
            <option value="all">{ui.filterArea}: {ui.all}</option>
            {allAreas.map((a) => (
              <option key={a} value={a}>
                {areaLabels[a][lang]}
              </option>
            ))}
          </select>

          <select className={styles.select} value={cuisine} onChange={(e) => setCuisine(e.target.value as any)}>
            <option value="all">{ui.filterCuisine}: {ui.all}</option>
            {allCuisines.map((c) => (
              <option key={c} value={c}>
                {cuisineLabels[c][lang]}
              </option>
            ))}
          </select>
        </div>
      </header>

      <p style={{ textAlign: "center", opacity: 0.7, marginTop: 12 }}>
        {filtered.length} result{filtered.length === 1 ? "" : "s"}
      </p>


      {filtered.length === 0 ? (
        <p style={{ textAlign: "center", opacity: 0.8, marginTop: 18 }}>{ui.noResults}</p>
      ) : (
        <section className={styles.grid}>
          {filtered.map((chef) => (
            <Link key={chef.slug} className={styles.card} href={`/chef/${chef.slug}`}>
              <h2 className={styles.cardTitle}>{chef.name}</h2>
              <p className={styles.cardDesc}>{lang === "ru" ? chef.description.ru : chef.description.en}</p>
              <div className={styles.cardCta}>{ui.viewMenu}</div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
