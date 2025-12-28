import type { I18nText, AreaCode, CuisineCode } from "@/lib/types";

export const areaLabels: Record<AreaCode, I18nText> = {
    central: { en: "Central", ru: "Центр" },
    northshore: { en: "North Shore", ru: "Норт-Шор" },
    west: { en: "West", ru: "Запад" },
    east: { en: "East", ru: "Восток" },
    south: { en: "South", ru: "Юг" },
    other: { en: "Other", ru: "Другое" },
};

export const cuisineLabels: Record<CuisineCode, I18nText> = {
    desserts: { en: "Desserts", ru: "Десерты" },
    russian: { en: "Russian", ru: "Русская кухня" },
    european: { en: "European", ru: "Европейская" },
    salads: { en: "Salads", ru: "Салаты" },
    home_style: { en: "Home-style", ru: "Домашняя" },
};
