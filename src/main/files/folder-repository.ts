import { randomUUID } from 'node:crypto';
import type { Database } from '../database/database';

export interface AllowedFolder {
  id: string;
  path: string;
  label: string;
}

export class FolderRepository {
  constructor(private readonly db: Database) {}

  list(): AllowedFolder[] {
    return this.db
      .prepare('SELECT id, path, label FROM allowed_folders ORDER BY created_at')
      .all() as unknown as AllowedFolder[];
  }

  add(path: string, label: string): AllowedFolder {
    const existing = this.db
      .prepare('SELECT id, path, label FROM allowed_folders WHERE path = ?')
      .get(path) as AllowedFolder | undefined;
    if (existing) return existing;
    const id = randomUUID();
    this.db.prepare('INSERT INTO allowed_folders (id, path, label) VALUES (?, ?, ?)').run(id, path, label);
    return { id, path, label };
  }

  remove(id: string): void {
    this.db.prepare('DELETE FROM allowed_folders WHERE id = ?').run(id);
  }
}
