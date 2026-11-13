import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { useSettings } from './store/settings';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ErrorState, LoadingState } from './components/StateViews';
import { Onboarding } from './features/onboarding/Onboarding';
import { DashboardPage } from './pages/DashboardPage';
import { SettingsPage } from './pages/SettingsPage';
import { ChatPage } from './features/chat/ChatPage';
import { ConfirmationDialog } from './features/tools/ConfirmationDialog';
import { ComputerPage } from './features/tools/ComputerPage';
import { HistoryPage } from './features/tools/HistoryPage';
import { TasksPage } from './features/memory/TasksPage';
import { MemoryPage } from './features/memory/MemoryPage';
import { ReminderToast } from './features/memory/ReminderToast';
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
            <Route path="/memory" element={<MemoryPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/computer" element={<ComputerPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <ConfirmationDialog />
      <ReminderToast />
    </div>
  );
}
