/**
 * MEDAI — tibbiy ma'lumot yordamchisi (MEDPERFECT dan birlashtirilgan).
 * OpenAI kaliti bo'lmasa, qoidaga asoslangan demo dvigatel ishlaydi (javob "AI emas" deb belgilanadi).
 */
import raw from "@/data/medical-terms.json";
// @ts-ignore — JS modul (MEDPERFECT/shared dan)
import { prepareLibrary, findTermsInText } from "./library.js";
// @ts-ignore
import { demoReply as rawDemoReply } from "./demo.js";
// @ts-ignore
import { assessMessage as rawAssess } from "./safety.js";

export interface LibraryTerm {
  id: string; term: string; category: string; aliases: string[]; simple: string; medical: string;
  related: string[]; doctorQuestions?: string[]; warning?: string;
  sources: { title: string; org: string; url: string }[];
}
export interface SafetyFlags { emergency: boolean; diagnosisRequest: boolean; doseRequest: boolean }
export interface DemoResult { kind: string; reply: string; sources: { title: string; org: string; url: string; term?: string }[]; sourceNote: string; flags: SafetyFlags }

export const library = prepareLibrary(raw) as { meta: { updatedAt: string; notice: string }; terms: (LibraryTerm & { _aliases: string[] })[] };
export const libraryTerms: LibraryTerm[] = library.terms.map(({ _aliases, ...t }) => t);
export const libraryMeta = library.meta;

export const demoReply = (message: string): DemoResult => rawDemoReply(message, library) as unknown as DemoResult;
export const assessMessage = (message: string): SafetyFlags => rawAssess(message) as unknown as SafetyFlags;
export const termsInText = (text: string): LibraryTerm[] => findTermsInText(library, text) as unknown as LibraryTerm[];
