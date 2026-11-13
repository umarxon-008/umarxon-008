import { z } from 'zod';
import type { ToolDeclaration, ToolManifest } from './types';

/**
 * Vositalar ro'yxati (prompt §6.4, §17). Faqat shu yerda ro'yxatdan o'tgan vositalarni chaqirish mumkin.
 * LEVEL 4 (taqiqlangan) amallar uchun vosita umuman yaratilmaydi.
 */
export class ToolRegistry {
  private tools = new Map<string, ToolManifest<unknown>>();

  register<I>(tool: ToolManifest<I>): void {
    if (!/^[a-z][a-z0-9_]{1,63}$/.test(tool.id)) throw new Error(`Noto'g'ri tool id: ${tool.id}`);
    if (this.tools.has(tool.id)) throw new Error(`Tool takrorlangan: ${tool.id}`);
    if ((tool.permissionLevel as number) > 3) throw new Error('LEVEL 4 amallar ro‘yxatdan o‘tkazilmaydi');
    this.tools.set(tool.id, tool as ToolManifest<unknown>);
  }

  get(id: string): ToolManifest<unknown> | undefined {
    return this.tools.get(id);
  }

  list(): ToolManifest<unknown>[] {
    return [...this.tools.values()];
  }

  /** Model uchun e'lonlar: parametrlar zod sxemasidan JSON Schema ko'rinishida */
  declarations(): ToolDeclaration[] {
    return this.list().map((t) => {
      const schema = z.toJSONSchema(t.input) as Record<string, unknown>;
      delete schema['$schema'];
      return { name: t.id, description: t.description, parameters: schema };
    });
  }
}
