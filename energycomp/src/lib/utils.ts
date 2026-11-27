export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function slugify(input: string): string {
  const map: Record<string, string> = { "o'": 'o', "g'": 'g', 'oʻ': 'o', 'gʻ': 'g', sh: 'sh', ch: 'ch' };
  let s = input.toLowerCase();
  for (const [k, v] of Object.entries(map)) s = s.split(k).join(v);
  s = s
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
  return s.slice(0, 40) || 'tashkilot';
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
