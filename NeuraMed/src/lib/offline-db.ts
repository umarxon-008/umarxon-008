// IndexedDB helper for offline-first reminders and caching
// Uses the 'idb' library for a Promise-based API

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { ReminderWithMed, DoseLogEntry } from "@/types";

interface NeuraMedDB extends DBSchema {
  reminders: {
    key: string;
    value: ReminderWithMed;
    indexes: { "by-status": string };
  };
  doseLogs: {
    key: string;
    value: DoseLogEntry;
    indexes: { "by-reminder": string; "by-date": string };
  };
  pendingSync: {
    key: string;
    value: {
      id: string;
      type: string;
      payload: unknown;
      createdAt: number;
    };
  };
}

let dbInstance: IDBPDatabase<NeuraMedDB> | null = null;

async function getDB(): Promise<IDBPDatabase<NeuraMedDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<NeuraMedDB>("neuramed", 1, {
    upgrade(db) {
      const reminderStore = db.createObjectStore("reminders", { keyPath: "id" });
      reminderStore.createIndex("by-status", "status");

      const logStore = db.createObjectStore("doseLogs", { keyPath: "id" });
      logStore.createIndex("by-reminder", "reminderId");
      logStore.createIndex("by-date", "scheduledAt");

      db.createObjectStore("pendingSync", { keyPath: "id" });
    },
  });

  return dbInstance;
}

// ── Reminders ─────────────────────────────────────────────────────────────────

export async function saveReminderOffline(reminder: ReminderWithMed) {
  const db = await getDB();
  await db.put("reminders", reminder);
}

export async function getReminderOffline(id: string) {
  const db = await getDB();
  return db.get("reminders", id);
}

export async function getAllRemindersOffline(): Promise<ReminderWithMed[]> {
  const db = await getDB();
  return db.getAll("reminders");
}

export async function deleteReminderOffline(id: string) {
  const db = await getDB();
  await db.delete("reminders", id);
}

// ── Dose Logs ─────────────────────────────────────────────────────────────────

export async function saveDoseLogOffline(log: DoseLogEntry) {
  const db = await getDB();
  await db.put("doseLogs", log);
}

export async function getDoseLogsForReminder(
  reminderId: string
): Promise<DoseLogEntry[]> {
  const db = await getDB();
  return db.getAllFromIndex("doseLogs", "by-reminder", reminderId);
}

// ── Pending sync ──────────────────────────────────────────────────────────────

export async function addPendingSync(type: string, payload: unknown) {
  const db = await getDB();
  const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await db.put("pendingSync", { id, type, payload, createdAt: Date.now() });
}

export async function getPendingSync() {
  const db = await getDB();
  return db.getAll("pendingSync");
}

export async function removePendingSync(id: string) {
  const db = await getDB();
  await db.delete("pendingSync", id);
}
