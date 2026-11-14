/**
 * Gemini modellarini suhbat uchun saralash. Model nomlari API'dan keladi (o'ylab topilmaydi);
 * bu yerda faqat nomdagi umumiy belgilar bo'yicha guruhlanadi.
 * - recommended: "flash" modellar — tez javob beradi va bepul limiti kattaroq
 * - chat: boshqa suhbat modellari (masalan, "pro": aqlliroq, lekin javobdan oldin uzoq o'ylaydi)
 * - other: suhbat uchun mo'ljallanmagan (ovoz, rasm yaratish, embedding, Gemma va h.k.)
 */
export type GeminiModelKind = 'recommended' | 'chat' | 'other';

const NOT_CHAT =
  /(tts|image|imagen|veo|embedding|aqa|audio|live|robotics|computer-use|learnlm|gemma|deep-research|nano-banana)/i;

export function classifyGeminiModel(name: string): GeminiModelKind {
  if (NOT_CHAT.test(name) || !/gemini/i.test(name)) return 'other';
  if (/flash/i.test(name)) return 'recommended';
  return 'chat';
}

/** Tavsiya etilganlar birinchi; ular ichida barqaror (preview/exp emas) versiyalar oldinda, yangi versiya yuqorida */
export function sortGeminiModels(models: string[]): { kind: GeminiModelKind; name: string }[] {
  const rank = { recommended: 0, chat: 1, other: 2 } as const;
  const unstable = (n: string) => (/(preview|exp|latest)/i.test(n) ? 1 : 0);
  const version = (n: string) => Number(/gemini-(\d+(?:\.\d+)?)/i.exec(n)?.[1] ?? 0);
  return models
    .map((name) => ({ name, kind: classifyGeminiModel(name) }))
    .sort(
      (a, b) =>
        rank[a.kind] - rank[b.kind] ||
        unstable(a.name) - unstable(b.name) ||
        version(b.name) - version(a.name) ||
        Number(/lite/i.test(a.name)) - Number(/lite/i.test(b.name)) ||
        a.name.localeCompare(b.name),
    );
}

/** Model tanlanmagan bo'lsa, avtomatik tanlanadigan model */
export function defaultGeminiModel(models: string[]): string | null {
  const first = sortGeminiModels(models)[0];
  return first && first.kind === 'recommended' ? first.name : null;
}
