"use client";

import Link from "next/link";
import styles from "./page.module.css";
import { chefs } from "@/data/chefs";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { t } from "@/components/i18n/t";

export default function HomePage() {
  const { lang } = useLanguage();
  const ui = t(lang);

  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>{ui.homeTitle}</h1>
        <p className={styles.subtitle}>{ui.homeSubtitle}</p>
      </header>

      <section className={styles.grid}>
        {chefs.map((chef) => (
          <Link key={chef.slug} className={styles.card} href={`/chef/${chef.slug}`}>
            <h2 className={styles.cardTitle}>{chef.name}</h2>
            <p className={styles.cardDesc}>
              {lang === "ru" ? chef.description.ru : chef.description.en}
            </p>


            <div className={styles.cardCta}>{ui.viewMenu}</div>
          </Link>
        ))}
      </section>
    </main>
  );
}
