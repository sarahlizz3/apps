import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useRecipe } from '../hooks/useRecipe';
import { AUTO_PREPENDED_STEPS } from '../utils/constants';

type Tab = 'full' | 'ingredients' | 'directions';

export default function CookingView() {
  const { recipeId } = useParams<{ recipeId: string }>();
  const { recipe, loading } = useRecipe(recipeId);
  const [activeTab, setActiveTab] = useState<Tab>('full');

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

  const ingredientsList = (
    <div>
      <h3 className="text-lg font-semibold text-body mb-3">Ingredients</h3>
      <ul className="space-y-2 text-base md:text-lg text-body">
        {recipe.ingredients.map((ing, i) => (
          <li key={i} className="py-1 border-b border-border last:border-b-0">
            {ing}
          </li>
        ))}
      </ul>
    </div>
  );

  const directionsList = (
    <div>
      <h3 className="text-lg font-semibold text-body mb-3">Directions</h3>
      <ol className="space-y-4 text-base md:text-lg text-body">
        {allDirections.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="shrink-0 w-7 h-7 rounded-full bg-hover text-secondary text-sm flex items-center justify-center font-medium mt-0.5">
              {i + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 shrink-0">
        <Link
          to={`/recipes/${recipe.id}`}
          className="shrink-0 text-secondary hover:text-body p-1"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <h2 className="text-lg font-bold text-body truncate flex-1">{recipe.title}</h2>
        <Link
          to={`/recipes/${recipe.id}/edit`}
          className="hidden md:inline-flex bg-hover text-body rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-section-border transition-colors"
        >
          Edit
        </Link>
      </div>

      {/* Desktop: two-column layout */}
      <div className="hidden md:grid md:grid-cols-[1fr_1.5fr] flex-1 min-h-0">
        {/* Left column: sticky ingredients */}
        <div className="sticky top-0 h-screen overflow-y-auto border-r border-border p-6">
          {ingredientsList}
        </div>
        {/* Right column: directions */}
        <div className="p-6 overflow-y-auto">
          {directionsList}
        </div>
      </div>

      {/* Mobile: tab content */}
      <div className="md:hidden flex-1 overflow-y-auto p-4 pb-24">
        {(activeTab === 'full' || activeTab === 'ingredients') && (
          <div className={activeTab === 'full' ? 'mb-8' : ''}>
            {ingredientsList}
          </div>
        )}
        {(activeTab === 'full' || activeTab === 'directions') && directionsList}
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-section-header border-t border-section-border px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex items-center justify-around z-10">
        {([
          { key: 'full' as Tab, label: 'Full' },
          { key: 'ingredients' as Tab, label: 'Ingredients' },
          { key: 'directions' as Tab, label: 'Directions' },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeTab === key
                ? 'bg-primary text-on-primary'
                : 'text-secondary hover:text-body'
            }`}
          >
            {label}
          </button>
        ))}
        <Link
          to={`/recipes/${recipe.id}/edit`}
          className="flex-1 py-1.5 text-xs font-medium rounded-lg text-secondary hover:text-body text-center transition-colors"
        >
          Edit
        </Link>
      </div>
    </div>
  );
}
