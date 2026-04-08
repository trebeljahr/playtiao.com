# Phase 2: Event-Tied Badges + Subscription Badges

## Prompt for Claude

```
Implement Phase 2 of the badge/shop system for the tiao project. Read the plan at .claude/plans/phase2-event-badges-subscriptions.md for full context. The plan has two parts:

Part A: Event-tied badges — auto-grant badges when specific achievements unlock
Part B: Subscription badges — Stripe recurring billing with auto-grant/revoke

The existing infrastructure is:
- Achievement system: server/game/achievementService.ts (onGameCompleted, onFriendAdded, onEloUpdated, etc.)
- Achievement definitions: shared/src/achievements.ts
- Badge service: server/game/badgeService.ts (grantBadge, revokeBadge)
- Shop routes: server/routes/shop.routes.ts (Stripe Checkout for one-time purchases)
- Shop catalog: server/config/shopCatalog.ts
- Shop page: client/src/views/ShopPage.tsx
- Badge definitions: client/src/components/UserBadge.tsx (BADGE_DEFINITIONS, BadgeId type)
- Badge selector: client/src/components/BadgeSelector.tsx

Implement both parts. Start with Part A (simpler), then Part B.
```

---

## Part A: Event-Tied Badges (Achievement → Badge Auto-Grant)

### Concept

When a player unlocks a specific achievement, they automatically receive a corresponding badge. The badge is permanent (earned, not purchased). These badges appear in the shop page as "Earned" (not buyable) alongside the purchasable supporter badges.

### New Badge Definitions

Add to `BadgeId` type and `BADGE_DEFINITIONS` in `UserBadge.tsx`:

| Badge ID           | Label     | Tier | Trigger Achievement     | Visual                |
| ------------------ | --------- | ---- | ----------------------- | --------------------- |
| `first-win`        | First Win | 1    | `first-multiplayer-win` | Green gradient        |
| `veteran`          | Veteran   | 1    | `games-played-50`       | Bronze/brown gradient |
| `centurion`        | Centurion | 2    | `games-played-100`      | Silver animated       |
| `social-butterfly` | Social    | 1    | `friends-10`            | Pink/coral gradient   |
| `streak-5`         | On Fire   | 2    | `win-streak-5`          | Orange animated       |

### Achievement→Badge Mapping

Create `server/config/badgeRewards.ts`:

```ts
// Maps achievement IDs to badge IDs that should be auto-granted
export const ACHIEVEMENT_BADGE_MAP: Record<string, string> = {
  "first-multiplayer-win": "first-win",
  "games-played-50": "veteran",
  "games-played-100": "centurion",
  "friends-10": "social-butterfly",
  "win-streak-5": "streak-5",
};
```

### Server Changes

**`server/game/achievementService.ts`** — After granting an achievement, check the badge map and auto-grant:

```ts
import { ACHIEVEMENT_BADGE_MAP } from "../config/badgeRewards";
import { grantBadge } from "./badgeService";

// In the function that grants achievements (after inserting into DB):
async function grantAchievementAndBadge(playerId: string, achievementId: string) {
  // ... existing achievement grant logic ...

  const badgeId = ACHIEVEMENT_BADGE_MAP[achievementId];
  if (badgeId) {
    await grantBadge(playerId, badgeId);
  }
}
```

**New achievements to define** (if not already in `shared/src/achievements.ts`):

- `first-multiplayer-win` — triggered in `onGameCompleted` when winner's total wins === 1
- `games-played-50` / `games-played-100` — triggered in `onGameCompleted` when total games reach threshold
- `friends-10` — triggered in `onFriendAdded` when friend count reaches 10
- `win-streak-5` — needs a win streak counter on GameAccount (new field) or computed from recent game history

### Client Changes

**`UserBadge.tsx`** — Add the 5 new badge definitions with appropriate gradients.

**`ShopPage.tsx`** — Show earned badges in a separate "Earned Badges" section (or inline with "Earned" label instead of price). The catalog endpoint already returns `owned: true` for badges the player has — earned badges would show the same way but with "Earned" instead of a price.

**`server/config/shopCatalog.ts`** — Earned badges should NOT be in the shop catalog (they can't be purchased). Instead, the shop page should fetch the player's badges separately and display earned ones.

**Alternative approach**: Add an `earnedOnly` flag to the catalog response. The shop page shows a combined view: purchasable badges with prices + earned badges with "Earned via [achievement name]" labels.

### Translation Keys

Add to all 3 locale files:

- Badge names for the 5 new badges
- Badge descriptions explaining how to earn them
- "Earned" label for the shop display

---

## Part B: Subscription Badges (Stripe Recurring Billing)

### Concept

"Patron" badges that require an active Stripe subscription. When the subscription lapses, the badge is revoked. The badge glows/animates differently to signal it's subscription-based.

### New Badge Definition

| Badge ID | Label  | Tier | Price       | Visual                                         |
| -------- | ------ | ---- | ----------- | ---------------------------------------------- |
| `patron` | Patron | 2    | $4.99/month | Warm amber animated gradient with subtle pulse |

### Database Changes

**`server/models/GameAccount.ts`** — Add subscription tracking:

```ts
stripeCustomerId?: string;         // Stripe customer ID for this account
activeSubscriptions?: Array<{
  subscriptionId: string;          // Stripe subscription ID
  badgeId: string;                 // Which badge this subscription grants
  status: "active" | "past_due" | "canceled";
  currentPeriodEnd: Date;          // When current billing period ends
}>;
```

### Server Changes

**`server/config/shopCatalog.ts`** — Add subscription items:

```ts
export type ShopItem = {
  type: "badge" | "theme";
  id: string;
  price: number;
  currency: "usd";
  recurring?: { interval: "month" | "year" };  // NEW
};

// Add:
{ type: "badge", id: "patron", price: 499, currency: "usd", recurring: { interval: "month" } },
```

**`server/routes/shop.routes.ts`** — New/modified endpoints:

1. **`POST /checkout`** — Modify to handle subscriptions:

   ```ts
   if (item.recurring) {
     // Create Stripe Checkout Session in "subscription" mode
     const session = await stripe.checkout.sessions.create({
       mode: "subscription",
       line_items: [{
         price_data: {
           currency: item.currency,
           unit_amount: item.price,
           recurring: { interval: item.recurring.interval },
           product_data: { name: `${item.id} badge (monthly)` },
         },
         quantity: 1,
       }],
       metadata: { playerId, itemType: item.type, itemId: item.id },
       success_url: ...,
       cancel_url: ...,
     });
   }
   ```

2. **`POST /webhook`** — Handle subscription lifecycle events:

   ```ts
   // checkout.session.completed (subscription mode) → grant badge + store subscription
   // customer.subscription.updated → update status
   // customer.subscription.deleted → revoke badge
   // invoice.payment_failed → mark as past_due, send warning
   ```

3. **`POST /cancel-subscription`** — NEW endpoint:

   ```ts
   // Player cancels their subscription
   // Calls stripe.subscriptions.cancel(subscriptionId)
   // Badge remains until current period ends (Stripe handles this)
   ```

4. **`GET /subscriptions`** — NEW endpoint:
   ```ts
   // Returns player's active subscriptions with status + renewal date
   ```

**Webhook event handling detail:**

```ts
switch (event.type) {
  case "checkout.session.completed":
    // mode === "subscription" → grant badge, store subscription
    break;
  case "customer.subscription.updated":
    // status changed → update DB
    // If status === "canceled" and current_period_end has passed → revoke badge
    break;
  case "customer.subscription.deleted":
    // Subscription fully ended → revoke badge
    await revokeBadge(playerId, badgeId);
    break;
  case "invoice.payment_failed":
    // Payment failed → mark subscription as past_due
    // Optionally: send in-app notification, dim the badge
    break;
}
```

### Client Changes

**`ShopPage.tsx`** — Subscription items show differently:

- Price displays as "$4.99/month" instead of "$4.99"
- Button says "Subscribe" instead of "Buy"
- If active: shows "Active — renews [date]" + "Cancel" button
- If past_due: shows warning "Payment failed — update billing"

**`client/src/lib/api.ts`** — New functions:

```ts
export function getSubscriptions() {
  return request<{ subscriptions: Subscription[] }>("/api/shop/subscriptions");
}

export function cancelSubscription(subscriptionId: string) {
  return request<{ message: string }>("/api/shop/cancel-subscription", {
    method: "POST",
    body: { subscriptionId },
  });
}
```

**`UserBadge.tsx`** — The `patron` badge gets a unique animation (e.g., slow breathing glow) to distinguish it from purchased and earned badges.

### Grace Period

When a subscription is canceled, Stripe keeps it active until `current_period_end`. During this grace period:

- Badge remains visible and active
- Shop shows "Cancels on [date]" instead of "Cancel"
- After the period ends, Stripe fires `customer.subscription.deleted` → badge revoked

### Stripe Setup Required

1. Stripe webhook needs additional event types enabled:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`

2. Stripe Customer objects need to be created for each player (on first checkout). Store `stripeCustomerId` on GameAccount.

---

## Implementation Order

1. **Part A first** (simpler, no Stripe changes):
   - Define new achievements if needed
   - Create badge reward mapping
   - Add auto-grant logic to achievementService
   - Add new badge definitions to UserBadge.tsx
   - Update shop page to show earned badges
   - Add translations
   - Write tests

2. **Part B second** (more complex):
   - Add subscription fields to GameAccount model
   - Add patron badge definition
   - Modify checkout endpoint for subscription mode
   - Add subscription webhook handlers
   - Add cancel-subscription endpoint
   - Update shop page UI for subscriptions
   - Add translations
   - Write tests
   - Test with Stripe CLI: `stripe listen --forward-to localhost:5005/api/shop/webhook`

## Key Files Reference

- `shared/src/achievements.ts` — achievement definitions
- `server/game/achievementService.ts` — achievement grant logic
- `server/game/badgeService.ts` — badge grant/revoke
- `server/routes/shop.routes.ts` — Stripe checkout + webhooks
- `server/config/shopCatalog.ts` — shop item catalog
- `server/models/GameAccount.ts` — player data model
- `client/src/components/UserBadge.tsx` — badge visuals + definitions
- `client/src/views/ShopPage.tsx` — shop page UI
- `client/src/components/BadgeSelector.tsx` — active badge picker
- `client/messages/{en,de,es}.json` — translations
