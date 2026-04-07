export type ShopItemType = "badge" | "theme";

export type ShopItem = {
  type: ShopItemType;
  id: string;
  /** Price in cents (USD). */
  price: number;
  currency: "usd";
};

export const SHOP_ITEMS: ShopItem[] = [
  // Badges — supporter tiers (including color variants) are purchasable.
  // Contributor, Champion, and Creator are earned/granted, not sold.
  { type: "badge", id: "supporter", price: 299, currency: "usd" },
  { type: "badge", id: "super-supporter", price: 599, currency: "usd" },
  { type: "badge", id: "badge-1", price: 299, currency: "usd" },
  { type: "badge", id: "badge-2", price: 299, currency: "usd" },
  { type: "badge", id: "badge-3", price: 599, currency: "usd" },
  { type: "badge", id: "badge-4", price: 599, currency: "usd" },
  { type: "badge", id: "badge-5", price: 299, currency: "usd" },
  { type: "badge", id: "badge-6", price: 599, currency: "usd" },
  { type: "badge", id: "badge-7", price: 999, currency: "usd" },
  { type: "badge", id: "badge-8", price: 599, currency: "usd" },

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
