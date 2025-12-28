export type Lang = "en" | "ru";

export type I18nText = { en: string; ru: string };

export type AreaCode = "central" | "northshore" | "west" | "east" | "south" | "other";
export type CuisineCode = "desserts" | "russian" | "european" | "salads" | "home_style";

export type Fulfilment = "pickup" | "delivery";

export type MenuItem = {
    id: string;
    name: I18nText;
    price_cents: number;
    description?: I18nText;
    is_active?: boolean;
    sort_order?: number | null;
};

export type Vendor = {
    slug: string;
    name: string;
    tagline?: I18nText;
    description: I18nText;

    area?: AreaCode;
    cuisine?: CuisineCode[];
    fulfilment?: Fulfilment[];

    location?: I18nText;
    instagram?: string;
    phone?: string;
    heroImage?: string;

    about?: I18nText;

    menu: MenuItem[];
};

export type ListChefsInput = {
    lang: Lang;
    q?: string;
    area?: AreaCode | "all";
    cuisine?: CuisineCode | "all";
};
