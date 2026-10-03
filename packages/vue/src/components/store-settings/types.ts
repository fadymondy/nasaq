/** A collection the discount scope picker and simulator know about. */
export interface SimCollection {
  id: string;
  title: string;
  productIds: readonly string[];
}

import type { GiftCard, GiftCardError } from "./gift-card-logic";

/** What a gift card lookup resolves: the card, or an error code. */
export type GiftCardLookup = GiftCard | { error: GiftCardError };
