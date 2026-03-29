import { describe, it, expect } from "vitest";
import { resolvePlayerBadges } from "./featureGate";

describe("resolvePlayerBadges", () => {
  it("returns empty array for null/undefined player", () => {
    expect(resolvePlayerBadges(null)).toEqual([]);
    expect(resolvePlayerBadges(undefined)).toEqual([]);
  });

  it("returns activeBadges from server when present", () => {
    expect(
      resolvePlayerBadges({
        displayName: "someone",
        activeBadges: ["supporter"],
      }),
    ).toEqual(["supporter"]);
  });

  it("returns empty array when server sends empty activeBadges (user chose hidden)", () => {
    expect(
      resolvePlayerBadges({
        displayName: "ricotrebeljahr",
        activeBadges: [],
      }),
    ).toEqual([]);
  });

  it("filters out invalid badge IDs from server data", () => {
    expect(
      resolvePlayerBadges({
        displayName: "someone",
        activeBadges: ["supporter", "not-a-real-badge"],
      }),
    ).toEqual(["supporter"]);
  });

  it("falls back to creator for preview users when activeBadges is undefined", () => {
    expect(
      resolvePlayerBadges({
        displayName: "ricotrebeljahr",
        activeBadges: undefined,
      }),
    ).toEqual(["creator"]);
  });

  it("returns empty array for non-preview users without activeBadges", () => {
    expect(
      resolvePlayerBadges({
        displayName: "randomuser",
      }),
    ).toEqual([]);
  });
});
