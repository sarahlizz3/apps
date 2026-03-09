import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { marked } from 'marked';
import { useRecipe } from '../hooks/useRecipe';
import { AUTO_PREPENDED_STEPS, DIFFICULTY_TIERS } from '../utils/constants';
import { formatRecipeAsText } from '../utils/recipeFormatter';
import DifficultyIcon from './DifficultyIcon';

export default function RecipeView() {
  const { recipeId } = useParams<{ recipeId: string }>();
  const { recipe, loading } = useRecipe(recipeId);
  const [copied, setCopied] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-secondary text-lg">Recipe not found</p>
        <Link to="/recipes" className="text-primary hover:text-primary-hover transition-colors">
          &larr; Back to recipes
        </Link>
      </div>
    );
  }

  const allDirections = [...AUTO_PREPENDED_STEPS, ...recipe.directions];
  const difficultyInfo = recipe.difficulty
    ? DIFFICULTY_TIERS.find((t) => t.key === recipe.difficulty)
    : null;

  async function handleShare() {
    const text = formatRecipeAsText(recipe!);

    if (navigator.share) {
      try {
        await navigator.share({ title: recipe!.title, text });
        return;
      } catch {
        // User cancelled or share failed, fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  }

  function handlePrint() {
    const allSteps = [...AUTO_PREPENDED_STEPS, ...recipe!.directions];

    const metaParts: string[] = [];
    if (recipe!.prepTime) metaParts.push(`Prep: ${recipe!.prepTime}`);
    if (recipe!.cookTime) metaParts.push(`Cook: ${recipe!.cookTime}`);
    if (recipe!.servings) metaParts.push(`Serves: ${recipe!.servings}`);

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${recipe!.title}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 700px; margin: 2rem auto; padding: 0 1rem; color: #222; }
  h1 { margin-bottom: 0.25rem; }
  .meta { color: #666; margin-bottom: 1.5rem; font-size: 0.9rem; }
  h2 { font-size: 1.1rem; margin-top: 1.5rem; border-bottom: 1px solid #ddd; padding-bottom: 0.25rem; }
  ul { padding-left: 1.25rem; }
  ol { padding-left: 1.25rem; }
  li { margin-bottom: 0.35rem; }
</style></head><body>
  <h1>${recipe!.title}</h1>
  ${metaParts.length > 0 ? `<p class="meta">${metaParts.join(' &middot; ')}${recipe!.category ? ` &middot; ${recipe!.category}` : ''}</p>` : recipe!.category ? `<p class="meta">${recipe!.category}</p>` : ''}
  <h2>Ingredients</h2>
  <ul>${recipe!.ingredients.map((i) => `<li>${i}</li>`).join('')}</ul>
  <h2>Directions</h2>
  <ol>${allSteps.map((s) => `<li>${s}</li>`).join('')}</ol>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url);
    if (w) {
      w.onload = () => { w.print(); URL.revokeObjectURL(url); };
    }
  }

  const notesHtml = recipe.notes ? marked.parse(recipe.notes) : '';

  return (
    <div className="p-4 max-w-3xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Link to="/recipes" className="shrink-0 text-secondary hover:text-body -ml-1 p-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <h2 className="text-xl font-bold text-body truncate">{recipe.title}</h2>
      </div>

      {/* Desktop action buttons */}
      <div className="hidden md:flex items-center gap-2 mb-4">
        <Link
          to={`/recipes/${recipe.id}/cook`}
          className="bg-primary text-on-primary rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary-hover transition-colors"
        >
          Cook
        </Link>
        <Link
          to={`/recipes/${recipe.id}/edit`}
          className="bg-hover text-body rounded-lg px-4 py-2 text-sm font-medium hover:bg-section-border transition-colors"
        >
          Edit
        </Link>
        <button
          onClick={handleShare}
          className="bg-hover text-body rounded-lg px-4 py-2 text-sm font-medium hover:bg-section-border transition-colors"
        >
          {copied ? 'Copied!' : 'Share'}
        </button>
        <button
          onClick={handlePrint}
          className="bg-hover text-body rounded-lg px-4 py-2 text-sm font-medium hover:bg-section-border transition-colors"
        >
          Print
        </button>
      </div>

      {/* Two-column desktop / single-column mobile */}
      <div className="md:grid md:grid-cols-[1fr_1.5fr] md:gap-6">
        {/* Left column */}
        <div className="space-y-4 mb-6 md:mb-0">
          {recipe.imageUrl && (
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              className="w-full rounded-xl max-h-72 object-cover"
            />
          )}

          {/* Metadata card */}
          <div className="bg-card rounded-xl border border-border p-4 space-y-2 text-sm">
            {recipe.prepTime && (
              <div className="flex justify-between">
                <span className="text-secondary">Prep time</span>
                <span className="text-body font-medium">{recipe.prepTime}</span>
              </div>
            )}
            {recipe.cookTime && (
              <div className="flex justify-between">
                <span className="text-secondary">Cook time</span>
                <span className="text-body font-medium">{recipe.cookTime}</span>
              </div>
            )}
            {recipe.servings && (
              <div className="flex justify-between">
                <span className="text-secondary">Servings</span>
                <span className="text-body font-medium">{recipe.servings}</span>
              </div>
            )}
            {difficultyInfo && (
              <div className="flex justify-between items-center">
                <span className="text-secondary">Difficulty</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <DifficultyIcon tier={recipe.difficulty} size="md" />
                  <span className="text-body">{difficultyInfo.label}</span>
                </span>
              </div>
            )}
            {recipe.category && (
              <div className="flex justify-between">
                <span className="text-secondary">Category</span>
                <span className="text-body font-medium">{recipe.category}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Ingredients */}
          <div>
            <h3 className="text-lg font-semibold text-body mb-3">Ingredients</h3>
            <ul className="space-y-1.5 text-body">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-secondary mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-secondary" />
                  <span>{ing}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Directions */}
          <div>
            <h3 className="text-lg font-semibold text-body mb-3">Directions</h3>
            <ol className="space-y-3 text-body">
              {allDirections.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-hover text-secondary text-xs flex items-center justify-center font-medium mt-0.5">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* Notes */}
      {recipe.notes && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-body mb-3">Notes</h3>
          <div
            className="prose prose-sm text-body max-w-none bg-card rounded-xl border border-border p-4"
            dangerouslySetInnerHTML={{ __html: notesHtml as string }}
          />
        </div>
      )}

      {/* Source URL */}
      {recipe.sourceUrl && (
        <div className="mt-4">
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary-hover text-sm transition-colors"
          >
            View source &rarr;
          </a>
        </div>
      )}

      {/* Mobile bottom bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-section-header border-t border-section-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex items-center justify-around z-10">
        <Link
          to={`/recipes/${recipe.id}/cook`}
          className="flex flex-col items-center gap-0.5 text-primary text-xs font-medium"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
          </svg>
          Cook
        </Link>
        <Link
          to={`/recipes/${recipe.id}/edit`}
          className="flex flex-col items-center gap-0.5 text-secondary text-xs font-medium"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
          </svg>
          Edit
        </Link>
        <button
          onClick={handleShare}
          className="flex flex-col items-center gap-0.5 text-secondary text-xs font-medium"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
          </svg>
          {copied ? 'Copied!' : 'Share'}
        </button>
        <button
          onClick={handlePrint}
          className="flex flex-col items-center gap-0.5 text-secondary text-xs font-medium"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
          </svg>
          Print
        </button>
      </div>
    </div>
  );
}
