/** Matryoshka customer price: chef-entered NZD cents plus 10%, rounded once per unit.
 * Chef input prices and size option deltas stay at original values in the database.
 * Quote and reservation must use the same calculation. */
export const CUSTOMER_MARKUP_PERCENT=10;
export function customerPriceCents(chefCents:number):number{
 if(!Number.isSafeInteger(chefCents)||chefCents<0)throw Error("Invalid chef price");
 return Math.round(chefCents*110/100);
}
