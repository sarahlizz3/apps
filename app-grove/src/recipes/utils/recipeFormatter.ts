/**
 * Format a recipe object as clean plain text for sharing.
 */

import { AUTO_PREPENDED_STEPS } from './constants';

interface FormattableRecipe {
  title: string;
  description?: string;
  ingredients: string[];
  directions: string[];
  prepTime?: string;
  cookTime?: string;
  servings?: string;
  tags?: string[];
  sourceUrl?: string;
}

export function formatRecipeAsText(recipe: FormattableRecipe): string {
  const lines: string[] = [];

  // Title
  lines.push(recipe.title.toUpperCase());
  if (recipe.description) lines.push(recipe.description);
  lines.push('');

  // Metadata line
  const metaParts: string[] = [];
  if (recipe.prepTime) metaParts.push(`Prep: ${recipe.prepTime}`);
  if (recipe.cookTime) metaParts.push(`Cook: ${recipe.cookTime}`);
  if (recipe.servings) metaParts.push(`Serves: ${recipe.servings}`);
  if (metaParts.length > 0) {
    lines.push(metaParts.join(' | '));
  }
  const tags = recipe.tags ?? [];
  if (tags.length > 0) {
    lines.push(`Tags: ${tags.join(', ')}`);
  }
  if (metaParts.length > 0 || tags.length > 0) {
    lines.push('');
  }

  // Ingredients
  if (recipe.ingredients.length > 0) {
    lines.push('INGREDIENTS');
    for (const ing of recipe.ingredients) {
      lines.push(`- ${ing}`);
    }
    lines.push('');
  }

  // Directions (auto-prepend steps + actual directions)
  const allSteps = [...AUTO_PREPENDED_STEPS, ...recipe.directions];
  if (allSteps.length > 0) {
    lines.push('DIRECTIONS');
    allSteps.forEach((step, i) => {
      lines.push(`${i + 1}. ${step}`);
    });
    lines.push('');
  }

  // Source
  if (recipe.sourceUrl) {
    lines.push(`Source: ${recipe.sourceUrl}`);
  }

  return lines.join('\n').trimEnd();
}
