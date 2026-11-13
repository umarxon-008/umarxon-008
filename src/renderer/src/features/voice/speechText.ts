/** Ovoz chiqarib o'qish uchun sof yordamchi funksiyalar (DOM'siz, unit testda sinaladi). */

/** Ovoz chiqarib o'qish uchun matn: kod bloklari va Markdown belgilari olib tashlanadi. */
export function speechText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?(```|$)/g, '. Kod namunasi ekranda. ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*#>_~]/g, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Uzun matnni gaplar bo'yicha ~220 belgilik qismlarga bo'ladi (tizim TTS uzun matnni kesib qo'yishi mumkin). */
export function splitSentences(text: string, max = 220): string[] {
  const sentences = text.match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g) ?? [text];
  const out: string[] = [];
  let current = '';
  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;
    if ((current + ' ' + s).trim().length > max && current) {
      out.push(current);
      current = s;
    } else {
      current = (current + ' ' + s).trim();
    }
    while (current.length > max) {
      const cut = current.lastIndexOf(' ', max);
      const at = cut > 40 ? cut : max;
      out.push(current.slice(0, at).trim());
      current = current.slice(at).trim();
    }
  }
  if (current) out.push(current);
  return out;
}

export function isUzbekVoice(v: { lang: string; name: string }): boolean {
  return /^uz/i.test(v.lang) || /uzbek|o['‘’]?zbek/i.test(v.name);
}
