import { randomUUID } from 'node:crypto';
import type { Reminder } from '@shared/ipc';
import type { Database } from '../database/database';

interface Row {
  id: string;
  title: string;
  description: string | null;
  due_at: string;
  timezone: string;
  status: Reminder['status'];
  notified_at: string | null;
  created_at: string;
}
const toReminder = (r: Row): Reminder => ({
  id: r.id,
  title: r.title,
  description: r.description,
  dueAt: r.due_at,
  timezone: r.timezone,
  status: r.status,
  notifiedAt: r.notified_at,
  createdAt: r.created_at,
});
const now = () => new Date().toISOString();

export class ReminderRepository {
  constructor(
    private readonly db: Database,
    private readonly timezone: () => string = () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  ) {}

  list(): Reminder[] {
    return (
      this.db
        .prepare("SELECT * FROM reminders ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, due_at")
        .all() as unknown as Row[]
    ).map(toReminder);
  }

  get(id: string): Reminder | null {
    const r = this.db.prepare('SELECT * FROM reminders WHERE id = ?').get(id) as Row | undefined;
    return r ? toReminder(r) : null;
  }

  create(title: string, due: Date, description?: string | null): Reminder {
    const id = randomUUID();
    this.db
      .prepare(
        'INSERT INTO reminders (id, title, description, due_at, timezone, status) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(id, title.trim(), description?.trim() || null, due.toISOString(), this.timezone(), 'pending');
    return this.get(id)!;
  }

  update(id: string, patch: { title?: string; description?: string | null; due?: Date }): void {
    const r = this.get(id);
    if (!r) return;
    const dueChanged = patch.due && patch.due.toISOString() !== r.dueAt;
    this.db
      .prepare(
        `UPDATE reminders SET title = ?, description = ?, due_at = ?, notified_at = ?, updated_at = ? WHERE id = ?`,
      )
      .run(
        patch.title?.trim() ?? r.title,
        patch.description !== undefined ? patch.description?.trim() || null : r.description,
        patch.due ? patch.due.toISOString() : r.dueAt,
        dueChanged ? null : r.notifiedAt, // vaqti o'zgarsa qayta bildiriladi
        now(),
        id,
      );
  }

  setStatus(id: string, status: Reminder['status']): void {
    this.db.prepare('UPDATE reminders SET status = ?, updated_at = ? WHERE id = ?').run(status, now(), id);
  }

  delete(id: string): boolean {
    return Number(this.db.prepare('DELETE FROM reminders WHERE id = ?').run(id).changes) > 0;
  }

  markNotified(id: string): void {
    this.db.prepare('UPDATE reminders SET notified_at = ? WHERE id = ?').run(now(), id);
  }

  /** Vaqti kelgan, hali bildirilmagan eslatmalar */
  due(at: Date): Reminder[] {
    return (
      this.db
        .prepare(
          "SELECT * FROM reminders WHERE status = 'pending' AND notified_at IS NULL AND due_at <= ? ORDER BY due_at",
        )
        .all(at.toISOString()) as unknown as Row[]
    ).map(toReminder);
  }

  nextDue(): Reminder | null {
    const r = this.db
      .prepare(
        "SELECT * FROM reminders WHERE status = 'pending' AND notified_at IS NULL ORDER BY due_at LIMIT 1",
      )
      .get() as Row | undefined;
    return r ? toReminder(r) : null;
  }
}
