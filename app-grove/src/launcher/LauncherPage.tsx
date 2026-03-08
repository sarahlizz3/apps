import { Link } from 'react-router-dom';
import { useAuth } from '../shared/AuthContext';
import { useTheme } from '../shared/ThemeContext';
import { signOut } from '../shared/auth';

export default function LauncherPage() {
  const { user } = useAuth();
  const { dark, toggleTheme } = useTheme();

  const apps = [
    {
      name: 'Packing List',
      description: 'Plan your trips, never forget a thing',
      path: '/packing',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      ),
    },
    {
      name: 'Health Dashboard',
      description: 'Track medications, providers, and health info',
      path: '/health',
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full bg-page">
      <header className="bg-section-header text-heading px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] flex items-center justify-between shrink-0 border-b border-section-border">
        <h1 className="text-lg font-semibold">AppGrove</h1>
        <div className="flex items-center gap-3">
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

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-md mx-auto space-y-3 mt-4">
          {apps.map((app) => (
            <Link
              key={app.path}
              to={app.path}
              className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:bg-hover transition-colors"
            >
              <div className="text-primary shrink-0">{app.icon}</div>
              <div>
                <h2 className="text-heading font-semibold">{app.name}</h2>
                <p className="text-secondary text-sm">{app.description}</p>
              </div>
              <svg className="w-5 h-5 text-muted ml-auto shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
