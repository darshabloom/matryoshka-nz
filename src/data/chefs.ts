export type MenuItem = {
    id: string;
    name: { en: string; ru: string };
    price: number;
    description?: { en: string; ru: string };
};

export type I18nText = { en: string; ru: string };

export type Chef = {
    slug: string;
    name: string;
    description: I18nText;
    menu: MenuItem[];
    tagline?: I18nText;
    cuisine?: string[];
    fulfilment?: ("pickup" | "delivery")[];
    location?: I18nText;
    instagram?: string; // just the handle, e.g. "blackforestkitchen"
    phone?: string;     // optional
    heroImage?: string; // later: "/images/chef.jpg"
    about?: I18nText;
};

export const chefs: Chef[] = [
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

        instagram: "blackforestkitchen",
        menu: [{
            id: "napoleon",
            name: { en: "Napoleon cake", ru: "Торт «Наполеон»" },
            price: 8.8, description: { en: "Portion.", ru: "Порция." }
        },],
    },

    // {
    //     slug: "julesnz",
    //     name: "Jules NZ",
    //     tagline: "Russian classics, made properly.",
    //     description: "Russian classics and salads.",
    //     cuisine: ["Russian", "Home-style"],
    //     fulfilment: ["pickup"],
    //     location: "Auckland (details shared after ordering)",
    //     instagram: "julesnz",
    //     about: {
    //         en: "Traditional Russian dishes for gatherings and celebrations, prepared in small batches.",
    //         ru: "Традиционные блюда русской кухни для встреч и праздников, готовлю небольшими партиями."
    //     },
    //     menu: [{
    //         id: "herring",
    //         name: { en: "Herring under fur coat", ru: "Селёдка под шубой" },
    //         price: 14.92,
    //         description: { en: "300 g.", ru: "300 г." }
    //     },],

    // },

];
