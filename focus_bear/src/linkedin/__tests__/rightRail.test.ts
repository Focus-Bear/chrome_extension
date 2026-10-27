import { describe, it, expect } from "vitest";
import {
  LABELLED_COUNT_BADGE_SELECTORS,
  MAX_HEADING_LENGTH,
  cardKindForHeading,
  isCountBadgeText,
  normalizeLabel,
} from "../rightRail.js";

describe("normalizeLabel", () => {
  it("folds typographic apostrophes, whitespace and case", () => {
    expect(normalizeLabel("  Today’s\n puzzles ")).toBe("today's puzzles");
  });
});

describe("cardKindForHeading", () => {
  it("recognises the News card's heading", () => {
    expect(cardKindForHeading("LinkedIn News")).toBe("news");
  });

  it("recognises the Puzzles card's heading as LinkedIn writes it", () => {
    expect(cardKindForHeading("Today’s puzzles")).toBe("puzzles");
    expect(cardKindForHeading("Today's puzzles")).toBe("puzzles");
  });

  it("ignores text that only mentions a heading", () => {
    expect(cardKindForHeading("Top stories from LinkedIn News")).toBeNull();
    expect(cardKindForHeading("x".repeat(MAX_HEADING_LENGTH + 1))).toBeNull();
  });
});

describe("isCountBadgeText", () => {
  it("accepts LinkedIn's count bubbles", () => {
    expect(isCountBadgeText("2")).toBe(true);
    expect(isCountBadgeText(" 99+ ")).toBe(true);
  });

  it("rejects labels and long numbers", () => {
    expect(isCountBadgeText("Notifications")).toBe(false);
    expect(isCountBadgeText("1,298")).toBe(false);
    expect(isCountBadgeText("1000")).toBe(false);
  });
});

describe("LABELLED_COUNT_BADGE_SELECTORS", () => {
  it("targets the count inside the bell's labelled link", () => {
    expect(LABELLED_COUNT_BADGE_SELECTORS).toContain(
      '[aria-label*="new notification" i] span[data-color-scheme]',
    );
  });
});
