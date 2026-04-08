// Maps existing achievement IDs to badge IDs that should be auto-granted.
// Only hard-to-earn achievements get badges — keeps them rare and prestigious.
export const ACHIEVEMENT_BADGE_MAP: Record<string, string> = {
  veteran: "veteran",
  "top-one-percent": "top-one-percent",
  "tournament-champion": "tournament-champion",
  "one-jump-wonder": "one-jump-wonder",
  "flawless-victory": "flawless-victory",
  "one-second-glory": "one-second-glory",
  "david-vs-goliath": "david-vs-goliath",
};
