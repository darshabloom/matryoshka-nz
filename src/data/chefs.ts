import type { Vendor } from "@/lib/types";


export const areaLabels = {
    central: { en: "Central", ru: "Центр" },
    northshore: { en: "North Shore", ru: "Норт-Шор" },
    west: { en: "West", ru: "Запад" },
    east: { en: "East", ru: "Восток" },
    south: { en: "South", ru: "Юг" },
    other: { en: "Other", ru: "Другое" },
} as const;

export const cuisineLabels = {
    desserts: { en: "Desserts", ru: "Десерты" },
    russian: { en: "Russian", ru: "Русская кухня" },
    european: { en: "European", ru: "Европейская" },
    salads: { en: "Salads", ru: "Салаты" },
    home_style: { en: "Home-style", ru: "Домашняя" },
} as const;


export const chefs: Vendor[] = [
    {
        slug: "blackforestkitchen",
        name: "Black Forest Kitchen",
        description: {
            en: "Desserts and cakes for celebrations.",
            ru: "Десерты и торты для праздников."
        },
        tagline: {
            en: "Celebration cakes with a European soul.",
            ru: "Праздничные торты с европейским характером."
        },
        location: {
            en: "Auckland (pickup location shared after ordering)",
            ru: "Окленд (место самовывоза сообщим после заказа)"
        },
        about: {
            en: "I make classic celebration cakes with a focus on flavour, balance, and clean presentation.",
            ru: "Я готовлю классические праздничные торты, уделяя внимание вкусу, балансу и аккуратной подаче."
        },
        area: "northshore",
        cuisine: ["desserts", "european"],
        instagram: "blackforestkitchen",
        menu: [{
            id: "napoleon",
            name: { en: "Napoleon cake", ru: "Торт «Наполеон»" },
            price_cents: 880, description: { en: "Portion.", ru: "Порция." }
        },],
    },

    {
        slug: "julesnz",
        name: "Jules NZ",
        tagline: {
            en: "Russian classics, made properly.",
            ru: "Русская классика, как надо."
        },
        description: {
            en: "Russian classics and salads.",
            ru: "Русская классика и салаты."
        },
        area: "central",
        cuisine: ["russian", "salads", "home_style"],
        fulfilment: ["pickup"],
        location: {
            en: "Auckland (details shared after ordering)",
            ru: "Окленд (детали сообщим после заказа)"
        },
        instagram: "julesnz",
        // phone: "+64...", // optional
        about: {
            en: "Traditional Russian dishes for gatherings and celebrations, prepared in small batches.",
            ru: "Традиционные блюда русской кухни для встреч и праздников, готовлю небольшими партиями."
        },
        menu: [
            {
                id: "herring",
                name: { en: "Herring under fur coat", ru: "Селёдка под шубой" },
                price_cents: 1492,
                description: { en: "300 g.", ru: "300 г." }
            }
        ],
    },


];

