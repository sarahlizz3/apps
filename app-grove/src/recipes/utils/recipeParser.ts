/**
 * Rule-based parser that takes messy pasted text and returns a structured
 * partial recipe object.
 */

const INGREDIENT_SECTION_RE =
  /^(?:ingredients?|what you(?:'ll)? need|you(?:'ll)? need)\s*:?\s*$/i;

const DIRECTION_SECTION_RE =
  /^(?:directions?|instructions?|method|steps?|preparation|how to(?:\s+make)?)\s*:?\s*$/i;

const METADATA_PATTERNS = {
  prepTime: /(?:prep(?:\s*time)?)\s*[:=]\s*(.+)/i,
  cookTime: /(?:cook(?:\s*time)?)\s*[:=]\s*(.+)/i,
  servings:
    /(?:serv(?:es|ings?)?|yield)\s*[:=]\s*(.+)/i,
};

const MEASUREMENT_RE =
  /\b(?:cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|grams?|g|kg|ml|liters?|litres?|quarts?|pints?|gallons?|cloves?|cans?|sticks?|slices?|pieces?|pinch(?:es)?|dash(?:es)?|bunch(?:es)?|sprigs?|heads?|package|pkg)\b/i;

const UNICODE_FRACTIONS: Record<string, string> = {
  '\u00BC': '1/4',
  '\u00BD': '1/2',
  '\u00BE': '3/4',
  '\u2150': '1/7',
  '\u2151': '1/9',
  '\u2152': '1/10',
  '\u2153': '1/3',
  '\u2154': '2/3',
  '\u2155': '1/5',
  '\u2156': '2/5',
  '\u2157': '3/5',
  '\u2158': '4/5',
  '\u2159': '1/6',
  '\u215A': '5/6',
  '\u215B': '1/8',
  '\u215C': '3/8',
  '\u215D': '5/8',
  '\u215E': '7/8',
};

const WEB_ARTIFACT_RE =
  /\b(?:add to shopping list|checkbox|advertisement|sponsored|print recipe|jump to recipe|save recipe|pin it)\b/i;

function normalizeUnicodeFractions(text: string): string {
  let result = text;
  for (const [char, replacement] of Object.entries(UNICODE_FRACTIONS)) {
    result = result.replaceAll(char, replacement);
  }
  return result;
}

function cleanIngredientLine(line: string): string {
  let cleaned = line;
  // Strip leading bullets, dashes, checkboxes, numbers with dots/parens
  cleaned = cleaned.replace(/^[\s]*(?:[-*\u2022\u25CB\u25CF\u2610\u2611\u2612]|\[.\]|\d+[.)]\s*)[\s]*/u, '');
  cleaned = normalizeUnicodeFractions(cleaned);
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  return cleaned;
}

function cleanDirectionLine(line: string): string {
  let cleaned = line;
  // Strip "Step N", "N.", "N)" prefixes
  cleaned = cleaned.replace(/^[\s]*(?:step\s+\d+\s*[:.)\-]?\s*|\d+[.)]\s*)/i, '');
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  return cleaned;
}

function isWebArtifact(line: string): boolean {
  return WEB_ARTIFACT_RE.test(line) || /^https?:\/\//i.test(line.trim());
}

function isAdvertisement(line: string): boolean {
  return /^advertisement$/i.test(line.trim());
}

function looksLikeIngredient(line: string): boolean {
  if (line.length > 200) return false;
  // Has a measurement unit
  if (MEASUREMENT_RE.test(line)) return true;
  // Starts with a number or fraction
  if (/^\s*\d/.test(line) && line.length < 100) return true;
  return false;
}

function looksLikeDirection(line: string): boolean {
  // Longer sentences tend to be directions
  return line.length > 40 || /\b(?:cook|bake|stir|mix|add|combine|heat|preheat|pour|place|set|let|cover|remove|serve|whisk|fold|chop|dice|slice|season|toss)\b/i.test(line);
}

function extractMetadata(
  lines: string[]
): { prepTime?: string; cookTime?: string; servings?: string } {
  const meta: { prepTime?: string; cookTime?: string; servings?: string } = {};
  for (const line of lines) {
    for (const [key, regex] of Object.entries(METADATA_PATTERNS)) {
      const match = line.match(regex);
      if (match) {
        meta[key as keyof typeof meta] = match[1].trim();
      }
    }
  }
  return meta;
}

export function parseRecipeText(text: string): {
  title: string;
  ingredients: string[];
  directions: string[];
  prepTime?: string;
  cookTime?: string;
  servings?: string;
} {
  const rawLines = text.split(/\r?\n/);
  const lines = rawLines.map((l) => l.trim());

  const metadata = extractMetadata(lines);

  let title = '';
  const ingredients: string[] = [];
  const directions: string[] = [];
  let currentSection: 'none' | 'ingredients' | 'directions' = 'none';
  let titleFound = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Skip web artifacts and ads
    if (isWebArtifact(line) || isAdvertisement(line)) continue;

    // Skip metadata lines (already extracted)
    const isMetadata = Object.values(METADATA_PATTERNS).some((r) => r.test(line));
    if (isMetadata) continue;

    // Check for section headers
    if (INGREDIENT_SECTION_RE.test(line)) {
      currentSection = 'ingredients';
      continue;
    }
    if (DIRECTION_SECTION_RE.test(line)) {
      currentSection = 'directions';
      continue;
    }

    // Title: first non-empty, non-keyword, non-metadata line
    if (!titleFound) {
      title = line;
      titleFound = true;
      continue;
    }

    // Accumulate into current section
    if (currentSection === 'ingredients') {
      const cleaned = cleanIngredientLine(line);
      if (cleaned && !isWebArtifact(cleaned)) {
        ingredients.push(cleaned);
      }
    } else if (currentSection === 'directions') {
      const cleaned = cleanDirectionLine(line);
      if (cleaned && !isWebArtifact(cleaned) && !isAdvertisement(cleaned)) {
        // Merge short continuation lines with previous direction
        if (
          directions.length > 0 &&
          cleaned.length < 30 &&
          !cleaned.endsWith('.') &&
          !/^[A-Z]/.test(cleaned)
        ) {
          directions[directions.length - 1] += ' ' + cleaned;
        } else {
          directions.push(cleaned);
        }
      }
    }
  }

  // Fallback: no clear sections found, use heuristics
  if (ingredients.length === 0 && directions.length === 0) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line === title) continue;
      if (isWebArtifact(line) || isAdvertisement(line)) continue;

      const isMetadata = Object.values(METADATA_PATTERNS).some((r) =>
        r.test(line)
      );
      if (isMetadata) continue;

      if (looksLikeIngredient(line)) {
        ingredients.push(cleanIngredientLine(line));
      } else if (looksLikeDirection(line)) {
        directions.push(cleanDirectionLine(line));
      }
    }
  }

  return {
    title,
    ingredients,
    directions,
    ...metadata,
  };
}
