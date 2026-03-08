import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { signInWithGoogle } from './auth';
import { useState } from 'react';

export default function LoginPage() {
  const { user, loading, authorized } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const [error, setError] = useState('');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (user && authorized) {
    return <Navigate to="/" replace />;
  }

  async function handleGoogle() {
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    }
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-full px-4 bg-page">
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 text-secondary hover:text-body transition-colors p-1"
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

      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-2 text-heading font-display">AppGrove</h1>
        <p className="text-primary text-center mb-8">Personal utility apps</p>

        {user && !authorized && (
          <div className="bg-reminder border border-reminder-border rounded-xl p-4 mb-6 text-center">
            <p className="text-reminder-text text-sm font-medium">Unauthorized account</p>
            <p className="text-reminder-body text-xs mt-1">This app is restricted to the owner only.</p>
          </div>
        )}

        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 bg-card border border-border rounded-xl px-4 py-3 text-sm font-medium text-secondary hover:bg-hover transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign in with Google
        </button>

        {error && <p className="text-reminder-text text-sm text-center mt-4">{error}</p>}
      </div>
    </div>
  );
}
