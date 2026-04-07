export type ShopItemType = "badge" | "theme";

export type ShopItem = {
  type: ShopItemType;
  id: string;
  /** Price in cents (USD). */
  price: number;
  currency: "usd";
};

export const SHOP_ITEMS: ShopItem[] = [
  // Badges
  { type: "badge", id: "supporter", price: 299, currency: "usd" },
  { type: "badge", id: "contributor", price: 299, currency: "usd" },
  { type: "badge", id: "super-supporter", price: 599, currency: "usd" },
  { type: "badge", id: "official-champion", price: 999, currency: "usd" },
  { type: "badge", id: "creator", price: 1499, currency: "usd" },

  // Board themes (classic is free/default, not in shop)
  { type: "theme", id: "night", price: 199, currency: "usd" },
  { type: "theme", id: "sakura", price: 199, currency: "usd" },
  { type: "theme", id: "ocean", price: 199, currency: "usd" },
  { type: "theme", id: "marble", price: 199, currency: "usd" },
];

/** Lookup a shop item by type + id. */
export function findShopItem(type: ShopItemType, id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.type === type && item.id === id);
}
