import 'server-only';

// Server muhit sozlamalari. Bu modul client bundle'ga tushmaydi ("server-only").
export const serverEnv = {
  get appUrl() {
    return process.env.APP_URL ?? 'http://localhost:3000';
  },
  get aiProvider(): 'rule-based' | 'anthropic' {
    return process.env.AI_PROVIDER === 'anthropic' ? 'anthropic' : 'rule-based';
  },
  get anthropicApiKey() {
    return process.env.ANTHROPIC_API_KEY || undefined;
  },
  get aiModel() {
    return process.env.AI_MODEL || 'claude-opus-5-5';
  },
  get demoDataEnabled() {
    return process.env.DEMO_DATA_ENABLED !== 'false';
  },
  get isProduction() {
    return process.env.NODE_ENV === 'production';
  },
  /** Email yuborish xizmati MVPda ulanmagan. */
  emailConfigured: false,
  /** To'lov provayderi MVPda ulanmagan. */
  paymentConfigured: false,
};
