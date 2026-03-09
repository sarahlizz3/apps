import { useState } from 'react';
import { parseRecipeText } from '../utils/recipeParser';
import { extractRecipeFromUrl } from '../utils/recipeExtractor';

interface ImportData {
  title: string;
  ingredients: string[];
  directions: string[];
  notes?: string;
  prepTime?: string;
  cookTime?: string;
  servings?: string;
  imageUrl?: string;
  sourceUrl?: string;
}

interface Props {
  onImport: (data: ImportData) => void;
}

type Tab = 'paste' | 'url' | 'blank';

const TABS: { key: Tab; label: string }[] = [
  { key: 'paste', label: 'Paste Recipe' },
  { key: 'url', label: 'From URL' },
  { key: 'blank', label: 'Start Blank' },
];

export default function RecipeImport({ onImport }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('paste');
  const [pasteText, setPasteText] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleParse() {
    if (!pasteText.trim()) return;
    const result = parseRecipeText(pasteText);
    onImport(result);
  }

  async function handleUrlImport() {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await extractRecipeFromUrl(url.trim());
      onImport(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import recipe');
    } finally {
      setLoading(false);
    }
  }

  function handleBlank() {
    onImport({
      title: '',
      ingredients: [],
      directions: [],
    });
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Tab buttons */}
      <nav className="flex border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setError(''); }}
            className={`flex-1 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary hover:text-body'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="p-4">
        {activeTab === 'paste' && (
          <div className="space-y-3">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste a full recipe here (title, ingredients, directions)..."
              rows={10}
              className="w-full bg-page border border-border rounded-lg px-3 py-2 text-sm text-body placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary resize-y"
            />
            <button
              onClick={handleParse}
              disabled={!pasteText.trim()}
              className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              Parse Recipe
            </button>
          </div>
        )}

        {activeTab === 'url' && (
          <div className="space-y-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/recipe"
              className="w-full bg-page border border-border rounded-lg px-3 py-2 text-sm text-body placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            <button
              onClick={handleUrlImport}
              disabled={!url.trim() || loading}
              className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40 flex items-center gap-2"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
              )}
              {loading ? 'Importing...' : 'Import'}
            </button>
          </div>
        )}

        {activeTab === 'blank' && (
          <div>
            <button
              onClick={handleBlank}
              className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Start with blank recipe
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
