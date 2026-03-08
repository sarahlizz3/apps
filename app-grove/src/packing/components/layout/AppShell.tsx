import { useRef } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';

const PULL_THRESHOLD = 80;

export default function AppShell() {
  const mainRef = useRef<HTMLElement>(null);
  const { pullDistance, refreshing } = usePullToRefresh(mainRef);

  return (
    <div className="flex flex-col h-full bg-page">
      <Header />
      <main ref={mainRef} className="flex-1 overflow-y-auto relative">
        {pullDistance > 0 && (
          <div
            className="flex items-center justify-center pointer-events-none"
            style={{ height: pullDistance }}
          >
            <svg
              className={`w-6 h-6 text-muted ${refreshing ? 'animate-spin' : ''}`}
              style={{
                opacity: Math.min(pullDistance / PULL_THRESHOLD, 1),
                transform: `rotate(${(pullDistance / PULL_THRESHOLD) * 360}deg)`,
              }}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182M20.016 4.66v4.993" />
            </svg>
          </div>
        )}
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
