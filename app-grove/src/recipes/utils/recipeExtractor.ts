/**
 * Extract structured recipe data from a URL by fetching its HTML and
 * parsing JSON-LD structured data, with fallbacks to Open Graph meta tags.
 */

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

interface ExtractedRecipe {
  title: string;
  ingredients: string[];
  directions: string[];
  prepTime?: string;
  cookTime?: string;
  servings?: string;
  imageUrl?: string;
  sourceUrl: string;
}

/**
 * Convert an ISO 8601 duration (e.g. PT1H30M) to a human-readable string.
 */
function parseIsoDuration(iso: string | undefined | null): string | undefined {
  if (!iso || typeof iso !== 'string') return undefined;
  const match = iso.match(/^PT?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!match) return iso; // return raw value if it doesn't match ISO pattern
  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} hr`);
  if (minutes > 0) parts.push(`${minutes} min`);
  return parts.length > 0 ? parts.join(' ') : undefined;
}

/**
 * Extract image URL from various JSON-LD image formats.
 */
function extractImageUrl(image: unknown): string | undefined {
  if (!image) return undefined;
  if (typeof image === 'string') return image;
  if (Array.isArray(image)) {
    const first = image[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && 'url' in first)
      return (first as { url: string }).url;
    return undefined;
  }
  if (typeof image === 'object' && image !== null && 'url' in image) {
    return (image as { url: string }).url;
  }
  return undefined;
}

/**
 * Normalize recipeInstructions from JSON-LD into a string[].
 * Handles: plain string, string[], HowToStep[], HowToSection[].
 */
function extractDirections(instructions: unknown): string[] {
  if (!instructions) return [];

  if (typeof instructions === 'string') {
    return instructions
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (Array.isArray(instructions)) {
    const result: string[] = [];
    for (const item of instructions) {
      if (typeof item === 'string') {
        result.push(item.trim());
      } else if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        if (obj['@type'] === 'HowToSection' && Array.isArray(obj.itemListElement)) {
          for (const subItem of obj.itemListElement) {
            if (typeof subItem === 'string') {
              result.push(subItem.trim());
            } else if (subItem && typeof subItem === 'object' && 'text' in subItem) {
              const text = (subItem as { text: string }).text?.trim();
              if (text) result.push(text);
            }
          }
        } else if ('text' in obj) {
          const text = (obj.text as string)?.trim();
          if (text) result.push(text);
        }
      }
    }
    return result;
  }

  return [];
}

/**
 * Find a Recipe object inside parsed JSON-LD data.
 */
function findRecipeInJsonLd(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null;

  const obj = data as Record<string, unknown>;

  if (obj['@type'] === 'Recipe') return obj;

  // Handle @graph arrays
  if (Array.isArray(obj['@graph'])) {
    for (const item of obj['@graph']) {
      if (
        item &&
        typeof item === 'object' &&
        (item as Record<string, unknown>)['@type'] === 'Recipe'
      ) {
        return item as Record<string, unknown>;
      }
    }
  }

  // Handle top-level arrays
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findRecipeInJsonLd(item);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Extract recipe data from a URL.
 */
export async function extractRecipeFromUrl(
  url: string
): Promise<ExtractedRecipe> {
  let html: string;
  try {
    const response = await fetch(
      `${CORS_PROXY}${encodeURIComponent(url)}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch URL (status ${response.status})`);
    }
    html = await response.text();
  } catch (err) {
    throw new Error(
      `Could not fetch the recipe page. Check the URL and try again.`
    );
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Try JSON-LD extraction
  const jsonLdScripts = doc.querySelectorAll(
    'script[type="application/ld+json"]'
  );

  for (const script of jsonLdScripts) {
    try {
      const parsed = JSON.parse(script.textContent || '');
      const recipe = findRecipeInJsonLd(parsed);
      if (recipe) {
        const ingredients = Array.isArray(recipe.recipeIngredient)
          ? (recipe.recipeIngredient as string[]).map((s) =>
              typeof s === 'string' ? s.trim() : String(s)
            )
          : [];

        const directions = extractDirections(recipe.recipeInstructions);

        const yield_ = recipe.recipeYield;
        let servings: string | undefined;
        if (Array.isArray(yield_)) {
          servings = String(yield_[0]);
        } else if (yield_ != null) {
          servings = String(yield_);
        }

        return {
          title: String(recipe.name || '').trim(),
          ingredients,
          directions,
          prepTime: parseIsoDuration(recipe.prepTime as string),
          cookTime: parseIsoDuration(recipe.cookTime as string),
          servings,
          imageUrl: extractImageUrl(recipe.image),
          sourceUrl: url,
        };
      }
    } catch {
      // Invalid JSON in this script tag, try the next one
    }
  }

  // Fallback: Open Graph meta tags
  const ogTitle =
    doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ??
    doc.querySelector('title')?.textContent ??
    '';
  const ogImage =
    doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ??
    undefined;

  if (!ogTitle) {
    throw new Error(
      'Could not find recipe data on this page. Try pasting the recipe text instead.'
    );
  }

  return {
    title: ogTitle.trim(),
    ingredients: [],
    directions: [],
    imageUrl: ogImage,
    sourceUrl: url,
  };
}
