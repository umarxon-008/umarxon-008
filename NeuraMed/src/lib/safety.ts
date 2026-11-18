/**
 * Xabar xavfsizligi tekshiruvi: shoshilinch belgilar, dori dozasi va tashxis so'rovlari.
 * MEDCONNECT chati va belgilar bo'yicha yo'naltirishda ishlatiladi (shoshilinch holatda 103 ogohlantirishi).
 */
// @ts-ignore — JS modul
import { assessMessage as rawAssess } from "./safety-check.js";

export interface SafetyFlags { emergency: boolean; diagnosisRequest: boolean; doseRequest: boolean }
export const assessMessage = (message: string): SafetyFlags => rawAssess(message) as unknown as SafetyFlags;
