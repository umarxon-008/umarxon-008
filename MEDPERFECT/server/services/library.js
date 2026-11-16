/** Server uchun kutubxona: data/medical-terms.json + umumiy qidiruv funksiyalari (shared/library.js). */
// JSON to'g'ridan-to'g'ri import qilinadi — Netlify Functions to'plamiga (bundle) ham kiradi.
import raw from '../../data/medical-terms.json' with { type: 'json' };
import * as shared from '../../shared/library.js';

export const library = shared.prepareLibrary(raw);
export const libraryMeta = library.meta;
export const terms = library.terms;
export const findTermsInText = (text) => shared.findTermsInText(library, text);
export const findTermForAnalyte = (name) => shared.findTermForAnalyte(library, name);
export const publicTerm = shared.publicTerm;
