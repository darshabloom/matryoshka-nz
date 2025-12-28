"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "en" | "ru";

type LangContextValue = {
    lang: Lang;
    setLang: (lang: Lang) => void;
    toggleLang: () => void;
};

const LangContext = createContext<LangContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [lang, setLangState] = useState<Lang>("en");

    useEffect(() => {
        const saved = localStorage.getItem("matryoshka_lang");
        if (saved === "en" || saved === "ru") setLangState(saved);
    }, []);

    useEffect(() => {
        localStorage.setItem("matryoshka_lang", lang);
        document.documentElement.lang = lang;
    }, [lang]);

    const value = useMemo<LangContextValue>(() => {
        return {
            lang,
            setLang: (l) => setLangState(l),
            toggleLang: () => setLangState((prev) => (prev === "en" ? "ru" : "en")),
        };
    }, [lang]);

    return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLanguage() {
    const ctx = useContext(LangContext);
    if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
    return ctx;
}
