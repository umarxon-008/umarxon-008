import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { useSettings } from './store/settings';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ErrorState, LoadingState } from './components/StateViews';
import { Onboarding } from './features/onboarding/Onboarding';
import { DashboardPage } from './pages/DashboardPage';
import { SettingsPage } from './pages/SettingsPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { ChatPage } from './features/chat/ChatPage';
import { uz } from './i18n/uz';

export function App() {
  const { status, settings, error, load } = useSettings();

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!settings) return;
    document.documentElement.dataset['theme'] = settings.theme;
    document.documentElement.dataset['reducedMotion'] = String(settings.reducedMotion);
  }, [settings]);

  if (status === 'loading' && !settings) return <LoadingState fullscreen />;
  if (status === 'error' || !settings) {
    return <ErrorState fullscreen message={error ?? uz.errors.loadSettings} onRetry={() => void load()} />;
  }

  if (!settings.onboardingCompleted) return <Onboarding />;

  return (
    <div className="shell">
      <Sidebar />
      <div className="shell__content">
        <TopBar />
        <main className="shell__main" id="main" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route
              path="/memory"
              element={
                <PlaceholderPage
                  title={uz.nav.memory}
                  phase={7}
                  description="MARIUS nimani eslab qolganini ko‘rish, tahrirlash, o‘chirish va eksport qilish. Obsidian Vault bilan ixtiyoriy integratsiya."
                />
              }
            />
            <Route
              path="/tasks"
              element={
                <PlaceholderPage
                  title={uz.nav.tasks}
                  phase={7}
                  description="Eslatmalar va vazifalar: vaqt kelganda Windows bildirishnomasi chiqadi."
                />
              }
            />
            <Route
              path="/history"
              element={
                <PlaceholderPage
                  title={uz.nav.history}
                  phase={4}
                  description="MARIUS bajargan barcha amallar jurnali: vaqt, amal, ruxsat darajasi, tasdiq va natija."
                />
              }
            />
            <Route
              path="/computer"
              element={
                <PlaceholderPage
                  title={uz.nav.computer}
                  phase={4}
                  description="Dasturlarni ochish, ochiq oynalar va ruxsat berilgan papkalarda fayl qidirish."
                />
              }
            />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
