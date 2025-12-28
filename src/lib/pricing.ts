export const SITE_MARKUP_RATE = 0.10; // 10%

export function applyMarkupCents(baseCents: number): number {
    return Math.round(baseCents * (1 + SITE_MARKUP_RATE));
}

export function centsToDollars(cents: number): string {
    return (cents / 100).toFixed(2);
}

export function sitePriceFromBaseCents(baseCents: number): string {
    return centsToDollars(applyMarkupCents(baseCents));
}
