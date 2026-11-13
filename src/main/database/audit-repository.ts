import { randomUUID } from 'node:crypto';
import type { AuditEntry, PermissionLevel, ToolActivity, ToolActivityStatus } from '@shared/ipc';
import type { Database } from './database';

export type Confirmation = AuditEntry['confirmation'];

export interface AuditStart {
  toolId: string;
  title: string;
  summary: string;
  permissionLevel: PermissionLevel;
  source: 'ai' | 'user';
  confirmation: Confirmation;
  status: ToolActivityStatus;
  conversationId: string | null;
  messageId: string | null;
}

interface Row {
  id: string;
  created_at: string;
  tool_id: string;
  title: string;
  summary: string;
  permission_level: PermissionLevel;
  source: 'ai' | 'user';
  confirmation: Confirmation;
  status: ToolActivityStatus;
  result_message: string | null;
  error_code: string | null;
  duration_ms: number | null;
  message_id: string | null;
}

const now = () => new Date().toISOString();

/** Amallar jurnali (prompt §20.6, §21): har bir tool chaqiruvi shu yerda. */
export class AuditRepository {
  constructor(private readonly db: Database) {}

  start(e: AuditStart): string {
    const id = randomUUID();
    this.db
      .prepare(
        `INSERT INTO action_audit (id, created_at, tool_id, title, summary, permission_level, source, confirmation,
           status, conversation_id, message_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        now(),
        e.toolId,
        e.title,
        e.summary,
        e.permissionLevel,
        e.source,
        e.confirmation,
        e.status,
        e.conversationId,
        e.messageId,
      );
    return id;
  }

  update(
    id: string,
    patch: {
      status?: ToolActivityStatus;
      confirmation?: Confirmation;
      resultMessage?: string | null;
      errorCode?: string | null;
      durationMs?: number;
      finished?: boolean;
    },
  ): void {
    this.db
      .prepare(
        `UPDATE action_audit SET
           status = COALESCE(?, status),
           confirmation = COALESCE(?, confirmation),
           result_message = COALESCE(?, result_message),
           error_code = COALESCE(?, error_code),
           duration_ms = COALESCE(?, duration_ms),
           finished_at = CASE WHEN ? THEN ? ELSE finished_at END
         WHERE id = ?`,
      )
      .run(
        patch.status ?? null,
        patch.confirmation ?? null,
        patch.resultMessage ?? null,
        patch.errorCode ?? null,
        patch.durationMs ?? null,
        patch.finished ? 1 : 0,
        now(),
        id,
      );
  }

  get(id: string): ToolActivity | null {
    const r = this.db.prepare('SELECT * FROM action_audit WHERE id = ?').get(id) as Row | undefined;
    return r ? toActivity(r) : null;
  }

  list(limit: number): AuditEntry[] {
    const rows = this.db
      .prepare('SELECT * FROM action_audit ORDER BY created_at DESC, rowid DESC LIMIT ?')
      .all(limit) as unknown as Row[];
    return rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      toolId: r.tool_id,
      summary: r.summary,
      permissionLevel: r.permission_level,
      source: r.source,
      confirmation: r.confirmation,
      status: r.status,
      errorCode: r.error_code,
      durationMs: r.duration_ms,
    }));
  }

  /** Suhbat kartalari uchun: bir nechta xabarga tegishli amallar */
  activitiesForMessages(messageIds: string[]): ToolActivity[] {
    if (messageIds.length === 0) return [];
    const placeholders = messageIds.map(() => '?').join(',');
    const rows = this.db
      .prepare(`SELECT * FROM action_audit WHERE message_id IN (${placeholders}) ORDER BY created_at, rowid`)
      .all(...messageIds) as unknown as Row[];
    return rows.map(toActivity);
  }

  clear(): void {
    this.db.exec('DELETE FROM action_audit');
  }

  /** Ilova crash bo'lsa, yarim qolgan amal "unknown" bo'ladi: bajarildi deb taxmin qilinmaydi (§21). */
  recoverInterrupted(): number {
    const r = this.db
      .prepare(
        "UPDATE action_audit SET status = 'unknown', error_code = 'INTERRUPTED' WHERE status IN ('running', 'awaiting_confirmation')",
      )
      .run();
    return Number(r.changes);
  }
}

function toActivity(r: Row): ToolActivity {
  return {
    id: r.id,
    messageId: r.message_id,
    toolId: r.tool_id,
    title: r.title,
    summary: r.summary,
    status: r.status,
    resultMessage: r.result_message,
    permissionLevel: r.permission_level,
    createdAt: r.created_at,
  };
}
