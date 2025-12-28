"use client";

import styles from "./ChefTemplate.module.css";
import type { Chef, MenuItem } from "@/data/chefs";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { t } from "@/components/i18n/t";

function Badge({ text }: { text: string }) {
    return <span className={styles.badge}>{text}</span>;
}

export default function ChefTemplate(chef: Chef) {
    const { lang } = useLanguage();
    const ui = t(lang);

    // lang-aware picker must live INSIDE the component (or accept lang as a param)
    const pick = (x?: { en: string; ru: string }) => (x ? (lang === "ru" ? x.ru : x.en) : "");

    const {
        name,
        tagline,
        description,
        cuisine,
        fulfilment,
        location,
        instagram,
        phone,
        about,
        menu,
    } = chef;

    return (
        <main className={styles.wrap}>
            <header className={styles.header}>
                <h1 className={styles.title}>{name}</h1>

                {tagline ? <p className={styles.tagline}>{pick(tagline)}</p> : null}

                <p className={styles.desc}>{pick(description)}</p>

                <div className={styles.badges}>
                    {cuisine?.map((c) => <Badge key={c} text={c} />)}
                    {fulfilment?.map((f) => (
                        <Badge key={f} text={f === "pickup" ? ui.pickup : ui.delivery} />
                    ))}
                </div>

                <div className={styles.meta}>
                    {location ? (
                        <div>
                            <b>{ui.locationLabel}</b> {pick(location)}
                        </div>
                    ) : null}

                    {instagram ? (
                        <div>
                            <b>{ui.instagramLabel}</b>{" "}
                            <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noreferrer">
                                @{instagram}
                            </a>
                        </div>
                    ) : null}

                    {phone ? (
                        <div>
                            <b>{ui.phoneLabel}</b> {phone}
                        </div>
                    ) : null}
                </div>
            </header>

            {about ? (
                <section className={styles.about}>
                    <h2 className={styles.h2}>{ui.aboutTitle}</h2>
                    <p className={styles.aboutP}>{pick(about)}</p>
                </section>
            ) : null}

            <section className={styles.menuSection}>
                <div className={styles.menuHeader}>
                    <h2 className={styles.h2}>{ui.menuTitle}</h2>
                    <div className={styles.orderNote}>{ui.comingSoon}</div>
                </div>

                <div className={styles.menu}>
                    {menu.map((item: MenuItem) => (
                        <article key={item.id} className={styles.card}>
                            <div className={styles.cardTop}>
                                <h3 className={styles.itemName}>{lang === "ru" ? item.name.ru : item.name.en}</h3>
                                <div className={styles.price}>${item.price.toFixed(2)}</div>
                            </div>

                            {item.description ? (
                                <p className={styles.itemDesc}>
                                    {lang === "ru" ? item.description.ru : item.description.en}
                                </p>
                            ) : null}
                        </article>
                    ))}
                </div>
            </section>
        </main>
    );
}
