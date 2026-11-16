// NeuraMed — Future Integration Points
// These stubs allow future modules to be connected without changing core code.

// ── Rentgen AI (future) ───────────────────────────────────────────────────────
// When a dedicated imaging AI model is available, implement this interface.
export interface ImagingAIProvider {
  analyzeImage(imageBuffer: Buffer): Promise<{
    findings: string[];
    confidence: number;
    disclaimer: string;
  }>;
}

// Stub — returns null until a real provider is configured
export const imagingAI: ImagingAIProvider | null = null;

// ── Pharmacy integration (future) ─────────────────────────────────────────────
export interface PharmacyProvider {
  searchDrug(name: string): Promise<{ price: number; available: boolean; pharmacy: string }[]>;
}

export const pharmacyProvider: PharmacyProvider | null = null;

// ── Doctor appointment (future) ───────────────────────────────────────────────
export interface AppointmentProvider {
  searchDoctors(specialty: string, city: string): Promise<{ name: string; clinic: string; phone: string }[]>;
}

export const appointmentProvider: AppointmentProvider | null = null;

// ── File storage ───────────────────────────────────────────────────────────────
export interface StorageProvider {
  upload(buffer: Buffer, filename: string, mimeType: string): Promise<string>;
  delete(url: string): Promise<void>;
  getSignedUrl(url: string): Promise<string>;
}

// Local storage for development
const localStorageProvider: StorageProvider = {
  async upload(_buffer, filename) {
    // In production: upload to Supabase Storage or Cloudflare R2
    return `/uploads/${filename}`;
  },
  async delete(_url) {
    // No-op for local
  },
  async getSignedUrl(url) {
    return url;
  },
};

export function getStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER;

  if (provider === "supabase") {
    // TODO: implement Supabase storage
    console.warn("Supabase storage not yet configured, using local");
    return localStorageProvider;
  }

  if (provider === "r2") {
    // TODO: implement Cloudflare R2 storage
    console.warn("R2 storage not yet configured, using local");
    return localStorageProvider;
  }

  return localStorageProvider;
}
