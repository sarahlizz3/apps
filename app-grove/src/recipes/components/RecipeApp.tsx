import { Routes, Route, Link } from 'react-router-dom';
import { useTheme } from '../../shared/ThemeContext';
import AppGroveLogo from '../../shared/AppGroveLogo';
import RecipeHome from './RecipeHome';
import RecipeForm from './RecipeForm';
import RecipeView from './RecipeView';
import CookingView from './CookingView';

export default function RecipeApp() {
  const { dark, toggleTheme } = useTheme();

  return (
    <div className="flex flex-col h-full bg-page">
      {/* Header */}
      <header className="bg-section-header text-heading px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] flex items-center justify-between shrink-0 border-b border-section-border">
        <div className="flex items-center gap-2">
          <Link to="/" className="text-primary-hover hover:text-heading transition-colors p-1" aria-label="Back to AppGrove" title="AppGrove">
            <AppGroveLogo />
          </Link>
          <h1 className="text-lg font-semibold font-display">Recipes</h1>
        </div>
        <button onClick={toggleTheme} className="text-primary-hover hover:text-heading transition-colors p-1" aria-label="Toggle theme">
          {dark ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
            </svg>
          )}
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route index element={<RecipeHome />} />
          <Route path="new" element={<RecipeForm />} />
          <Route path=":recipeId" element={<RecipeView />} />
          <Route path=":recipeId/cook" element={<CookingView />} />
          <Route path=":recipeId/edit" element={<RecipeForm />} />
        </Routes>
      </main>
    </div>
  );
}
