// Grafiklar va SVG uchun dizayn tokenlari (globals.css bilan bir xil qiymatlar).
export const tokens = {
  navy: '#102B5C',
  brand: '#1677F2',
  brandLight: '#D3E5FD',
  energy: '#20B879',
  energyLight: '#BFEBD8',
  surface: '#F3F8FF',
  muted: '#52627A',
  line: '#DFE7F2',
  amber: '#F2B01E',
  orange: '#E8650F',
  danger: '#D93F45',
  grayStatus: '#7D8BA1',
} as const;

export const STATUS_COLORS = {
  RUNNING: tokens.energy,
  STANDBY: tokens.amber,
  STOPPED: tokens.grayStatus,
  WARNING: tokens.orange,
  OFFLINE: tokens.danger,
} as const;

export const ZONE_COLORS = {
  blue: { fill: '#EAF2FE', stroke: '#B9D4FB' },
  green: { fill: '#E9F8F1', stroke: '#B5E6CF' },
  amber: { fill: '#FFF7E3', stroke: '#F5DDA0' },
  slate: { fill: '#F1F4F8', stroke: '#D3DAE5' },
  violet: { fill: '#F2EFFD', stroke: '#D5CCF7' },
} as const;

// Kategorial tartib (dataviz validator bilan tekshirilgan: CVD va normal ko'rish ajralishi PASS).
// #C98A00 kontrasti 3:1 dan past — shu sababli grafiklarda legend va jadval ko'rinishi majburiy.
export const SERIES_COLORS = ['#1677F2', '#179A64', '#7C5CE0', '#C98A00', '#0E8FA0', '#E8650F'];

/** Ogohlantirish darajalari grafiklarda (validatsiyadan o'tgan uchlik). */
export const SEVERITY_CHART_COLORS = { INFO: '#1677F2', WARNING: '#C98A00', CRITICAL: '#D93F45' } as const;
