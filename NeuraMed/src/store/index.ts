import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UserProfile, ReminderWithMed } from "@/types";
import type { Locale } from "@/i18n";

// ── Auth Store ─────────────────────────────────────────────────────────────────

interface AuthState {
  user: { id: string; name?: string; email?: string } | null;
  isLoading: boolean;
  setUser: (user: AuthState["user"]) => void;
  clearUser: () => void;
  setLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
  setLoading: (isLoading) => set({ isLoading }),
}));

// ── Settings Store ─────────────────────────────────────────────────────────────

interface SettingsState {
  locale: Locale;
  theme: "light" | "dark" | "system";
  pushEnabled: boolean;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: SettingsState["theme"]) => void;
  setPushEnabled: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      locale: "uz",
      theme: "light",
      pushEnabled: false,
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
      setPushEnabled: (pushEnabled) => set({ pushEnabled }),
    }),
    { name: "neuramed-settings" }
  )
);

// ── Profile Store ──────────────────────────────────────────────────────────────

interface ProfileState {
  profile: UserProfile | null;
  isLoading: boolean;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (v: boolean) => void;
}

export const useProfileStore = create<ProfileState>()((set) => ({
  profile: null,
  isLoading: false,
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
}));

// ── Reminders Store ────────────────────────────────────────────────────────────

interface RemindersState {
  reminders: ReminderWithMed[];
  isLoading: boolean;
  setReminders: (reminders: ReminderWithMed[]) => void;
  addReminder: (reminder: ReminderWithMed) => void;
  updateReminder: (id: string, data: Partial<ReminderWithMed>) => void;
  removeReminder: (id: string) => void;
  setLoading: (v: boolean) => void;
}

export const useRemindersStore = create<RemindersState>()((set) => ({
  reminders: [],
  isLoading: false,
  setReminders: (reminders) => set({ reminders }),
  addReminder: (reminder) =>
    set((state) => ({ reminders: [reminder, ...state.reminders] })),
  updateReminder: (id, data) =>
    set((state) => ({
      reminders: state.reminders.map((r) =>
        r.id === id ? { ...r, ...data } : r
      ),
    })),
  removeReminder: (id) =>
    set((state) => ({
      reminders: state.reminders.filter((r) => r.id !== id),
    })),
  setLoading: (isLoading) => set({ isLoading }),
}));

// ── Medication search cache (in-memory, session only) ─────────────────────────

interface MedSearchState {
  recentSearches: string[];
  addSearch: (term: string) => void;
  clearSearches: () => void;
}

export const useMedSearchStore = create<MedSearchState>()(
  persist(
    (set) => ({
      recentSearches: [],
      addSearch: (term) =>
        set((state) => ({
          recentSearches: [
            term,
            ...state.recentSearches.filter((s) => s !== term),
          ].slice(0, 10),
        })),
      clearSearches: () => set({ recentSearches: [] }),
    }),
    { name: "neuramed-recent-searches" }
  )
);
