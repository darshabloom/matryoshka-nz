"use client";

import styles from "./LanguageToggle.module.css";
import { useLanguage } from "@/components/i18n/LanguageProvider";

export default function LanguageToggle() {
    const { lang, toggleLang } = useLanguage();

    return (
        <button
            type="button"
            className={styles.btn}
            onClick={toggleLang}
            aria-label="Toggle language"
            title="Toggle language"
        >
            {lang === "en" ? "EN" : "RU"}
        </button>
    );
}
