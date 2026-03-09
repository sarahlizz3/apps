import { useState, useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../shared/AuthContext';
import { useTheme } from '../shared/ThemeContext';
import { signOut } from '../shared/auth';
import AppGroveLogo from '../shared/AppGroveLogo';
import DifficultyIcon from '../recipes/components/DifficultyIcon';
import { getLauncherSettings, type ExternalApp } from './launcherSettings';

interface AppDef {
  key: string;
  name: string;
  description: string;
  path: string;
  iconBg: string;
  iconColor: string;
  icon: ReactNode;
}

const BUILTIN_APPS: Record<string, AppDef> = {
  packing: {
    key: 'packing',
    name: 'Packing List',
    description: 'Plan your trips, never forget a thing',
    path: '/packing',
    iconBg: 'bg-accent-packing/15',
    iconColor: 'text-accent-packing',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
  },
  health: {
    key: 'health',
    name: 'Health Dashboard',
    description: 'Track medications, providers, and health info',
    path: '/health',
    iconBg: 'bg-accent-health/15',
    iconColor: 'text-accent-health',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
  },
  recipes: {
    key: 'recipes',
    name: 'Recipes',
    description: 'Recipe collection & cooking companion',
    path: '/recipes',
    iconBg: 'bg-accent-recipes/15',
    iconColor: 'text-accent-recipes',
    icon: <DifficultyIcon tier="rice-bowl" size="xl" />,
  },
};

const DEFAULT_ORDER = ['packing', 'health', 'recipes'];

export default function LauncherPage() {
  const { user } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const [appOrder, setAppOrder] = useState<string[]>(DEFAULT_ORDER);
  const [externalApps, setExternalApps] = useState<ExternalApp[]>([]);

  useEffect(() => {
    getLauncherSettings().then((s) => {
      setAppOrder(s.appOrder);
      setExternalApps(s.externalApps);
    });
  }, []);

  const orderedApps = appOrder.map((key) => BUILTIN_APPS[key]).filter(Boolean);

  return (
    <div className="relative flex flex-col h-full bg-page overflow-hidden">
      {/* Corner glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full blur-3xl" style={{ background: 'var(--glow-1)' }} />
        <div className="absolute -bottom-40 -right-32 w-96 h-96 rounded-full blur-3xl" style={{ background: 'var(--glow-2)' }} />
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl" style={{ background: 'var(--glow-3)' }} />
      </div>

      <header className="relative z-10 text-heading px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <AppGroveLogo className="w-6 h-6" />
          <h1 className="text-xl font-bold font-display">AppGrove</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/settings"
            className="text-primary-hover hover:text-heading transition-colors p-1"
            aria-label="Settings"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          </Link>
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
          {user && (
            <button
              onClick={() => signOut()}
              className="text-sm text-primary-hover hover:text-heading transition-colors"
            >
              Sign Out
            </button>
          )}
        </div>
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto p-4">
        <div className="max-w-md mx-auto space-y-4 mt-6">
          <p className="text-center text-muted text-sm">Your apps, one place.</p>
          {orderedApps.map((app) => (
            <Link
              key={app.path}
              to={app.path}
              className="group flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:bg-hover transition-colors"
            >
              <div
                className={`shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${app.iconColor} ${app.iconBg}`}
              >
                {app.icon}
              </div>
              <div className="min-w-0">
                <h2 className="text-heading font-semibold font-display">{app.name}</h2>
                <p className="text-secondary text-sm">{app.description}</p>
              </div>
              <svg className="w-5 h-5 text-muted ml-auto shrink-0 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          ))}

          {/* External Apps */}
          {externalApps.length > 0 && (
            <>
              <div className="flex items-center gap-3 pt-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-muted text-xs font-medium uppercase tracking-wider">External Apps</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              {externalApps.map((app) => (
                <a
                  key={app.id}
                  href={app.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:bg-hover transition-colors"
                >
                  <div className="shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-primary bg-primary/10">
                    <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-heading font-semibold font-display">{app.name}</h2>
                    {app.description && <p className="text-secondary text-sm">{app.description}</p>}
                  </div>
                  <svg className="w-5 h-5 text-muted ml-auto shrink-0 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </a>
              ))}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
