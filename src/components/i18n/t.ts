import type { Lang } from "./LanguageProvider";

export function t(lang: Lang) {
    return {
        brand: "Matryoshka NZ",

        // Home
        homeTitle: lang === "ru" ? "Матрёшка NZ" : "Matryoshka NZ",
        homeSubtitle:
            lang === "ru"
                ? "Маркетплейс домашней еды. Выберите кухню и меню."
                : "A multi-vendor food marketplace. Browse kitchens and menus.",
        viewMenu: lang === "ru" ? "Смотреть меню" : "View menu",

        // Chef page
        aboutTitle: lang === "ru" ? "О нас" : "About",
        menuTitle: lang === "ru" ? "Меню" : "Menu",
        locationLabel: lang === "ru" ? "Локация:" : "Location:",
        instagramLabel: lang === "ru" ? "Инстаграм:" : "Instagram:",
        phoneLabel: lang === "ru" ? "Телефон:" : "Phone:",
        comingSoon: lang === "ru" ? "Заказы скоро откроются." : "Ordering coming soon.",
        pickup: lang === "ru" ? "самовывоз" : "pickup",
        delivery: lang === "ru" ? "доставка" : "delivery",
    };
}
