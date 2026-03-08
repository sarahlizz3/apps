import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../shared/ThemeContext';
import { useHealthData } from './useHealthData';
import { ToastProvider } from './components/Toast';
import MedicationsSection from './components/MedicationsSection';
import DiagnosesSection from './components/DiagnosesSection';
import ProvidersSection from './components/ProvidersSection';
import ExplainersSection from './components/ExplainersSection';
import NotesSection from './components/NotesSection';
import FormInfoSection from './components/FormInfoSection';
import PrintSection from './components/PrintSection';
import ImportSection from './components/ImportSection';

const SECTIONS = [
  { key: 'medications', label: 'Meds', priority: true },
  { key: 'diagnoses', label: 'Diagnoses', priority: true },
  { key: 'providers', label: 'Providers', priority: true },
  { key: 'explainers', label: 'Explainers', priority: false },
  { key: 'notes', label: 'Notes', priority: false },
  { key: 'forminfo', label: 'Form Info', priority: false },
  { key: 'print', label: 'Print/Export', priority: false },
  { key: 'import', label: 'Import', priority: false },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

export default function HealthApp() {
  const { dark, toggleTheme } = useTheme();
  const { data, setData, loading, reload } = useHealthData();
  const [activeSection, setActiveSection] = useState<SectionKey>('medications');
  const [moreOpen, setMoreOpen] = useState(false);

  const prioritySections = SECTIONS.filter(s => s.priority);
  const moreSections = SECTIONS.filter(s => !s.priority);
  const moreHasActive = moreSections.some(s => s.key === activeSection);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-page">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="flex flex-col h-full bg-page">
        {/* Header */}
        <header className="bg-section-header text-heading px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] flex items-center justify-between shrink-0 border-b border-section-border">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-primary-hover hover:text-heading transition-colors p-1" aria-label="Back to AppGrove">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <h1 className="text-lg font-semibold">Health Dashboard</h1>
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

        {/* Tab Navigation */}
        <nav className="bg-card border-b border-border px-2 flex items-center gap-1 overflow-x-auto shrink-0">
          {prioritySections.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeSection === s.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-secondary hover:text-body'
              }`}
            >
              {s.label}
            </button>
          ))}
          <div className="relative">
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
                moreHasActive ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-body'
              }`}
            >
              More...
            </button>
            {moreOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMoreOpen(false)} />
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-40 py-1 min-w-[140px]">
                  {moreSections.map(s => (
                    <button
                      key={s.key}
                      onClick={() => { setActiveSection(s.key); setMoreOpen(false); }}
                      className={`block w-full text-left px-4 py-2 text-xs font-medium transition-colors ${
                        activeSection === s.key ? 'text-primary bg-hover' : 'text-secondary hover:bg-hover'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </nav>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4">
          <div className="max-w-2xl mx-auto">
            {activeSection === 'medications' && <MedicationsSection data={data} setData={setData} />}
            {activeSection === 'diagnoses' && <DiagnosesSection data={data} setData={setData} />}
            {activeSection === 'providers' && <ProvidersSection data={data} setData={setData} />}
            {activeSection === 'explainers' && <ExplainersSection data={data} setData={setData} />}
            {activeSection === 'notes' && <NotesSection data={data} setData={setData} />}
            {activeSection === 'forminfo' && <FormInfoSection data={data} />}
            {activeSection === 'print' && <PrintSection data={data} />}
            {activeSection === 'import' && <ImportSection onImported={reload} />}
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}
