import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './shared/ThemeContext';
import { AuthProvider } from './shared/AuthContext';
import ProtectedRoute from './shared/ProtectedRoute';
import LoginPage from './shared/LoginPage';
import LauncherPage from './launcher/LauncherPage';
import SettingsPage from './launcher/SettingsPage';

// Packing list app
import PackingAppShell from './packing/components/layout/AppShell';
import PackingHomePage from './packing/components/home/HomePage';
import TripDetailPage from './packing/components/trip/TripDetailPage';
import TemplatesPage from './packing/components/templates/TemplatesPage';
import SectionTemplateEditor from './packing/components/templates/SectionTemplateEditor';
import PackingListTemplateEditor from './packing/components/templates/PackingListTemplateEditor';

// Health app
import HealthApp from './health/HealthApp';

// Recipe app
import RecipeApp from './recipes/components/RecipeApp';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter basename="/app-grove">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <Routes>
                    <Route path="/" element={<LauncherPage />} />
                    <Route path="/settings" element={<SettingsPage />} />

                    {/* Packing List */}
                    <Route element={<PackingAppShell />}>
                      <Route path="/packing" element={<PackingHomePage />} />
                      <Route path="/packing/trip/:tripId" element={<TripDetailPage />} />
                      <Route path="/packing/templates" element={<TemplatesPage />} />
                      <Route path="/packing/templates/sections/:sectionId" element={<SectionTemplateEditor />} />
                      <Route path="/packing/templates/packing-lists/:templateId" element={<PackingListTemplateEditor />} />
                    </Route>

                    {/* Health Dashboard */}
                    <Route path="/health/*" element={<HealthApp />} />

                    {/* Recipes */}
                    <Route path="/recipes/*" element={<RecipeApp />} />
                  </Routes>
                </ProtectedRoute>
              }
              path="/*"
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
