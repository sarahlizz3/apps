import { DEFAULT_CATEGORY } from './constants';

/**
 * A recipe's tags. Recipes saved before tags existed have a single `category`
 * instead; it reads as a one-tag list. The old "Uncategorized" default reads as
 * no tags. Old recipes switch to `tags` the next time they're saved.
 */
export function recipeTags(recipe: { tags?: string[]; category?: string }): string[] {
  if (recipe.tags) return recipe.tags;
  if (recipe.category && recipe.category !== DEFAULT_CATEGORY) return [recipe.category];
  return [];
}

/** Lowercase, trimmed, with a trailing plural dropped: "Soups" and "soup" compare equal. */
function looseKey(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/ies$/, 'y')
    .replace(/(?:es|s)$/, '');
}

/** The existing tag with exactly this name, ignoring case. */
export function exactTag(typed: string, existing: string[]): string | undefined {
  const t = typed.trim().toLowerCase();
  return existing.find((e) => e.toLowerCase() === t);
}

/**
 * An existing tag that is close to what was typed but not the same
 * ("soups" when "Soup" exists), so the form can offer it instead of
 * creating a near-duplicate.
 */
export function similarTag(typed: string, existing: string[]): string | undefined {
  if (!typed.trim() || exactTag(typed, existing)) return undefined;
  const key = looseKey(typed);
  return existing.find((e) => looseKey(e) === key);
}
