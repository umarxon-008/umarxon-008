// Rollar va ruxsatlar matritsasi. Server har bir so'rovda shu matritsa bo'yicha tekshiradi;
// UI faqat qulaylik uchun tugmalarni yashiradi.

export const ORG_ROLES = ['OWNER', 'MANAGER', 'ENGINEER', 'VIEWER'] as const;
export type OrgRoleName = (typeof ORG_ROLES)[number];

export const PERMISSIONS = {
  'org.view': ['OWNER', 'MANAGER', 'ENGINEER', 'VIEWER'],
  'org.update': ['OWNER'],
  'tariff.update': ['OWNER'],
  'factory.write': ['OWNER', 'ENGINEER'],
  'factory.delete': ['OWNER'],
  'equipment.write': ['OWNER', 'ENGINEER'],
  'map.write': ['OWNER', 'ENGINEER'],
  'category.write': ['OWNER', 'ENGINEER'],
  'alert.update': ['OWNER', 'MANAGER', 'ENGINEER'],
  'inspector.run': ['OWNER', 'MANAGER', 'ENGINEER'],
  'ai.analyze': ['OWNER', 'MANAGER', 'ENGINEER'],
  'ai.feedback': ['OWNER', 'MANAGER', 'ENGINEER', 'VIEWER'],
  'control.request': ['OWNER', 'ENGINEER'],
  'control.review': ['OWNER', 'MANAGER'],
  'control.configure': ['OWNER'],
  'users.view': ['OWNER', 'MANAGER'],
  'users.manage': ['OWNER'],
  'billing.view': ['OWNER', 'MANAGER'],
  'billing.manage': ['OWNER'],
  'integration.manage': ['OWNER'],
  'audit.view': ['OWNER', 'MANAGER'],
  'reports.export': ['OWNER', 'MANAGER', 'ENGINEER', 'VIEWER'],
} as const satisfies Record<string, readonly OrgRoleName[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: OrgRoleName | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

export const ROLE_LABELS: Record<OrgRoleName, string> = {
  OWNER: 'Tashkilot egasi',
  MANAGER: 'Menejer',
  ENGINEER: 'Muhandis',
  VIEWER: "Kuzatuvchi (faqat ko'rish)",
};

export const ROLE_DESCRIPTIONS: Record<OrgRoleName, string> = {
  OWNER: "Tashkilot sozlamalari, tarif, foydalanuvchilar va barcha ma'lumotlarni boshqaradi.",
  MANAGER: "Dashboard, xarita, hisobot va ogohlantirishlarni ko'radi; boshqaruv so'rovlarini tasdiqlaydi.",
  ENGINEER: "Uskunalar, xarita va monitoring ma'lumotlarini boshqaradi.",
  VIEWER: "Faqat ko'rish huquqi.",
};
