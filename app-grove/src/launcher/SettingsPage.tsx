import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../shared/ThemeContext';
import { useAuth } from '../shared/AuthContext';
import AppGroveLogo from '../shared/AppGroveLogo';
import {
  getLauncherSettings,
  saveLauncherSettings,
  type LauncherSettings,
  type ExternalApp,
} from './launcherSettings';

const BUILTIN_APPS: Record<string, string> = {
  packing: 'Packing List',
  health: 'Health Dashboard',
  recipes: 'Recipes',
};

export default function SettingsPage() {
  const { dark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const [settings, setSettings] = useState<LauncherSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // External app form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formDesc, setFormDesc] = useState('');

  useEffect(() => {
    if (!uid) return;
    getLauncherSettings(uid).then((s) => {
      setSettings(s);
      setLoading(false);
    });
  }, [uid]);

  async function save(updated: LauncherSettings) {
    setSettings(updated);
    setSaving(true);
    await saveLauncherSettings(uid, updated);
    setSaving(false);
  }

  function moveApp(index: number, direction: -1 | 1) {
    if (!settings) return;
    const order = [...settings.appOrder];
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    save({ ...settings, appOrder: order });
  }

  function moveExternal(index: number, direction: -1 | 1) {
    if (!settings) return;
    const apps = [...settings.externalApps];
    const target = index + direction;
    if (target < 0 || target >= apps.length) return;
    [apps[index], apps[target]] = [apps[target], apps[index]];
    save({ ...settings, externalApps: apps });
  }

  function openAddForm() {
    setEditingId(null);
    setFormName('');
    setFormUrl('');
    setFormDesc('');
    setShowForm(true);
  }

  function openEditForm(app: ExternalApp) {
    setEditingId(app.id);
    setFormName(app.name);
    setFormUrl(app.url);
    setFormDesc(app.description);
    setShowForm(true);
  }

  function saveExternalApp() {
    if (!settings || !formName.trim() || !formUrl.trim()) return;
    const apps = [...settings.externalApps];

    if (editingId) {
      const idx = apps.findIndex((a) => a.id === editingId);
      if (idx !== -1) {
        apps[idx] = { ...apps[idx], name: formName.trim(), url: formUrl.trim(), description: formDesc.trim() };
      }
    } else {
      apps.push({
        id: Date.now().toString(36),
        name: formName.trim(),
        url: formUrl.trim(),
        description: formDesc.trim(),
      });
    }

    save({ ...settings, externalApps: apps });
    setShowForm(false);
  }

  function deleteExternalApp(id: string) {
    if (!settings) return;
    save({ ...settings, externalApps: settings.externalApps.filter((a) => a.id !== id) });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-page">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full bg-page overflow-hidden">
      {/* Corner glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full blur-3xl" style={{ background: 'var(--glow-1)' }} />
        <div className="absolute -bottom-40 -right-32 w-96 h-96 rounded-full blur-3xl" style={{ background: 'var(--glow-2)' }} />
      </div>

      <header className="relative z-10 text-heading px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Link to="/" className="text-heading hover:text-primary transition-colors flex items-center gap-2">
            <AppGroveLogo className="w-6 h-6" />
            <h1 className="text-xl font-bold font-display">Settings</h1>
          </Link>
        </div>
        <button
          onClick={toggleTheme}
          className="text-primary-hover hover:text-heading transition-colors p-1"
          aria-label="Toggle theme"
        >
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

      <main className="relative z-10 flex-1 overflow-y-auto p-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Back link */}
          <Link to="/" className="inline-flex items-center gap-1 text-primary hover:text-primary-hover text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Back to Home
          </Link>

          {/* App Order */}
          <section>
            <h2 className="text-heading font-semibold font-display text-lg mb-3">App Order</h2>
            <div className="bg-card border border-border rounded-xl divide-y divide-border">
              {settings!.appOrder.map((key, i) => (
                <div key={key} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-body font-medium flex-1">{BUILTIN_APPS[key] ?? key}</span>
                  <button
                    onClick={() => moveApp(i, -1)}
                    disabled={i === 0}
                    className="p-1 text-secondary hover:text-body disabled:opacity-30 transition-colors"
                    aria-label="Move up"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveApp(i, 1)}
                    disabled={i === settings!.appOrder.length - 1}
                    className="p-1 text-secondary hover:text-body disabled:opacity-30 transition-colors"
                    aria-label="Move down"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            {saving && <p className="text-muted text-xs mt-2">Saving...</p>}
          </section>

          {/* External Apps */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-heading font-semibold font-display text-lg">External Apps</h2>
              <button
                onClick={openAddForm}
                className="text-primary hover:text-primary-hover text-sm font-medium transition-colors"
              >
                + Add App
              </button>
            </div>

            {settings!.externalApps.length === 0 && !showForm && (
              <p className="text-muted text-sm">No external apps yet. Add shortcuts to your other apps and sites.</p>
            )}

            {settings!.externalApps.length > 0 && (
              <div className="bg-card border border-border rounded-xl divide-y divide-border mb-3">
                {settings!.externalApps.map((app, i) => (
                  <div key={app.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-medium truncate">{app.name}</p>
                      <p className="text-muted text-xs truncate">{app.url}</p>
                    </div>
                    <button
                      onClick={() => moveExternal(i, -1)}
                      disabled={i === 0}
                      className="p-1 text-secondary hover:text-body disabled:opacity-30 transition-colors"
                      aria-label="Move up"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                      </svg>
                    </button>
                    <button
                      onClick={() => moveExternal(i, 1)}
                      disabled={i === settings!.externalApps.length - 1}
                      className="p-1 text-secondary hover:text-body disabled:opacity-30 transition-colors"
                      aria-label="Move down"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                    <button
                      onClick={() => openEditForm(app)}
                      className="p-1 text-secondary hover:text-body transition-colors"
                      aria-label="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteExternalApp(app.id)}
                      className="p-1 text-secondary hover:text-red-500 transition-colors"
                      aria-label="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add/Edit Form */}
            {showForm && (
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <h3 className="text-body font-medium text-sm">{editingId ? 'Edit App' : 'Add External App'}</h3>
                <input
                  type="text"
                  placeholder="App name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-page border border-border rounded-lg px-3 py-2 text-sm text-body placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <input
                  type="url"
                  placeholder="https://..."
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="w-full bg-page border border-border rounded-lg px-3 py-2 text-sm text-body placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full bg-page border border-border rounded-lg px-3 py-2 text-sm text-body placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={saveExternalApp}
                    disabled={!formName.trim() || !formUrl.trim()}
                    className="bg-primary text-on-primary rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
                  >
                    {editingId ? 'Save' : 'Add'}
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="bg-hover text-body rounded-lg px-4 py-2 text-sm font-medium hover:bg-section-border transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
