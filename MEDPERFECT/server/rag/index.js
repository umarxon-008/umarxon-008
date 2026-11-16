/**
 * RAG (Retrieval-Augmented Generation) uchun tayyorlangan interfeys.
 *
 * HOLAT: HALI ULANMAGAN. Bu modul hozircha hech qanday manba qaytarmaydi va
 * javoblar "rasmiy manba bilan tasdiqlangan" deb belgilanmaydi.
 *
 * Kelajakda bajariladigan bosqichlar (README > RAG bo'limiga qarang):
 *  1. ingestDocument(file, meta)   — ishonchli hujjatni qabul qilish (manba, sana, litsenziya bilan)
 *  2. extractText(doc)            — matnni ajratish
 *  3. chunk(text)                 — kichik bo'laklarga ajratish (~800 token, 100 token overlap)
 *  4. embed(chunks)               — embedding yaratish
 *  5. search(query, k)            — tegishli bo'laklarni topish
 *  6. Topilgan bo'laklarni AI so'roviga <manbalar> sifatida qo'shish
 *  7. Javob ostida hujjat nomi va bo'limini ko'rsatish
 */
export const ragStatus = Object.freeze({ enabled: false, documents: 0 });

/** @returns {Promise<Array<{title:string, section:string, url?:string, date?:string, text:string}>>} */
export async function searchSources(/* query */) {
  return [];
}
