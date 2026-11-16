/**
 * MEDSTOCK AI — NAMUNAVIY (DEMO) ZAXIRA MA'LUMOTLARI.
 * Bir dorixona/ombor misolida. expiresIn — bugundan necha kun keyin muddati tugashi.
 * avgDaily — kunlik o'rtacha sarf (qoidaga asoslangan tahlil uchun). Narxlar so'mda, taxminiy namuna.
 */
export const STOCK_ITEMS = [
  { id: 's1', name: 'Paratsetamol 500 mg №20', category: 'Ogʻriq qoldiruvchi', unit: 'quti', qty: 240, min: 80, avgDaily: 9, batch: 'NF-2405-118', expiresIn: 588, shelf: 'A-1', price: 6500 },
  { id: 's2', name: 'Ibuprofen 400 mg №30', category: 'Yalligʻlanishga qarshi', unit: 'quti', qty: 34, min: 60, avgDaily: 5, batch: 'NF-2402-551', expiresIn: 310, shelf: 'A-2', price: 14800 },
  { id: 's3', name: 'Amoksitsillin 500 mg №16', category: 'Antibiotik', unit: 'quti', qty: 58, min: 40, avgDaily: 4, batch: 'SF-2407-031', expiresIn: 632, shelf: 'B-1', price: 23500 },
  { id: 's4', name: 'Omeprazol 20 mg №30', category: 'Oshqozon-ichak', unit: 'quti', qty: 72, min: 30, avgDaily: 2, batch: 'SF-2402-077', expiresIn: 75, shelf: 'B-3', price: 18900 },
  { id: 's5', name: 'Metformin 850 mg №60', category: 'Endokrin', unit: 'quti', qty: 18, min: 35, avgDaily: 3, batch: 'SM-2406-210', expiresIn: 570, shelf: 'C-1', price: 31000 },
  { id: 's6', name: 'Insulin 100 TB/ml 10 ml', category: 'Endokrin', unit: 'flakon', qty: 12, min: 20, avgDaily: 1.5, batch: 'DB-24K-552', expiresIn: 290, shelf: 'Sovutgich-1', price: 98000 },
  { id: 's7', name: 'Loratadin 10 mg №10', category: 'Allergiyaga qarshi', unit: 'quti', qty: 130, min: 40, avgDaily: 3, batch: 'DP-2408-014', expiresIn: 1035, shelf: 'A-4', price: 9800 },
  { id: 's8', name: 'Vitamin D3 2000 XB tomchi', category: 'Vitamin', unit: 'flakon', qty: 46, min: 25, avgDaily: 2, batch: 'SM-2409-505', expiresIn: 690, shelf: 'D-2', price: 42000 },
  { id: 's9', name: 'Seftriakson 1 g', category: 'Antibiotik', unit: 'flakon', qty: 95, min: 50, avgDaily: 4, batch: 'SF-2309-114', expiresIn: 38, shelf: 'B-2', price: 12500 },
  { id: 's10', name: 'Natriy xlorid 0,9% 200 ml', category: 'Infuziya', unit: 'flakon', qty: 310, min: 120, avgDaily: 14, batch: 'NF-2408-300', expiresIn: 720, shelf: 'E-1', price: 7200 },
  { id: 's11', name: 'Bint steril 7×14', category: 'Tibbiy buyum', unit: 'dona', qty: 420, min: 150, avgDaily: 12, batch: 'TB-2405-020', expiresIn: 1400, shelf: 'F-1', price: 3500 },
  { id: 's12', name: 'Atorvastatin 20 mg №30', category: 'Yurak-qon tomir', unit: 'quti', qty: 27, min: 30, avgDaily: 2, batch: 'DP-2403-088', expiresIn: 160, shelf: 'C-3', price: 36500 },
  { id: 's13', name: 'Diklofenak gel 1% 40 g', category: 'Yalligʻlanishga qarshi', unit: 'tuba', qty: 64, min: 30, avgDaily: 1, batch: 'NF-2310-412', expiresIn: -6, shelf: 'A-5', price: 16200 },
  { id: 's14', name: 'Ambroksol sirop 100 ml', category: 'Nafas yoʻllari', unit: 'flakon', qty: 52, min: 30, avgDaily: 3, batch: 'SF-2405-219', expiresIn: 26, shelf: 'D-4', price: 19400 },
];

export const LEAD_TIME_DAYS = 10;   // yetkazib berish o'rtacha muddati (demo)
export const EXPIRY_WARN_DAYS = 90; // shu kundan kam qolsa — "muddati yaqin"
