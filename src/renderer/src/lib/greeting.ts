import { uz } from '../i18n/uz';

/** Kun vaqtiga qarab o'zbekcha salomlashuv. */
export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 11) return uz.greeting.morning;
  if (hour >= 11 && hour < 17) return uz.greeting.day;
  if (hour >= 17 && hour < 23) return uz.greeting.evening;
  return uz.greeting.night;
}
