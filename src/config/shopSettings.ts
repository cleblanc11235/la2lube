/**
 * Operational settings for the shop app (as opposed to marketing copy, which
 * lives in shopBrand.ts).
 */

/** Sales tax charged on every ticket. Matches DataLube (12%, on the whole ticket). */
export const TAX_RATE = 0.12;

/** "12%" — for invoice and sidebar labels. */
export const TAX_LABEL = `${parseFloat((TAX_RATE * 100).toFixed(3))}%`;

/** Number of service bays shown on the Bay Board. */
export const BAY_COUNT = 2;

/** Miles until the next oil change, printed on the windshield sticker. Same for every oil. */
export const NEXT_SERVICE_MILES = 5000;
