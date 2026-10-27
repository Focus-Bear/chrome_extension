/**
 * LinkedIn's right-rail cards ("LinkedIn News", "Today's puzzles") and nav count bubbles have only
 * hashed class names, so they are recognised by what they say and what they link to.
 */

export type RightRailCardKind = "news" | "puzzles";

interface RightRailCard {
  kind: RightRailCardKind;
  /** Normalised heading text (see normalizeLabel). */
  headings: string[];
  /** Links only this card holds, whatever the page's language. */
  linkSelector: string;
}

export const RIGHT_RAIL_CARDS: RightRailCard[] = [
  { kind: "news", headings: ["linkedin news"], linkSelector: 'a[href*="/news/story/"]' },
  { kind: "puzzles", headings: ["today's puzzles"], linkSelector: 'a[href*="/games/"]' },
];

/** The home feed's column: a card never grows into it, and a post by "LinkedIn News" is not a card. */
export const FEED_SELECTOR =
  '[data-testid="mainFeed"], main [data-component-type="LazyColumn"], .scaffold-finite-scroll';

/** Past these a card would be the page, not a card. */
export const CARD_BOUNDARY_SELECTOR = 'html, body, main, [role="main"]';

/** A heading longer than this is a sentence, not a card's title. */
export const MAX_HEADING_LENGTH = 60;

/** LinkedIn writes "Today’s puzzles" with a typographic apostrophe. */
export const normalizeLabel = (text: string): string =>
  text
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export const cardKindForHeading = (text: string): RightRailCardKind | null => {
  if (text.length > MAX_HEADING_LENGTH) return null;
  const label = normalizeLabel(text);
  const card = RIGHT_RAIL_CARDS.find((candidate) => candidate.headings.includes(label));
  return card ? card.kind : null;
};

/** A nav count bubble: up to three digits, with LinkedIn's "99+". */
export const isCountBadgeText = (text: string): boolean => /^\d{1,3}\+?$/.test(text.trim());

/** Count bubbles inside a nav link labelled "Notifications, 2 new notifications" (LinkedIn's 2026 nav). */
export const LABELLED_COUNT_BADGE_SELECTORS = [
  "new notification",
  "new message",
  "new invitation",
  "new invite",
  "new update",
].map((phrase) => `[aria-label*="${phrase}" i] span[data-color-scheme]`);
