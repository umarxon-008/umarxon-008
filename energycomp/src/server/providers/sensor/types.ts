// Sensor ma'lumot manbalari uchun umumiy interfeys.
// Yangi integratsiya (MQTT, Modbus gateway, OPC UA ...) shu interfeysni amalga oshiruvchi adapter sifatida qo'shiladi.

export type SourceKind = 'DEMO' | 'REAL';

export interface ProviderEquipment {
  id: string;
  nominalPowerKw: number;
  baselinePowerKw: number | null;
  hasProductionSignal: boolean;
  sensorId: string | null;
  demoConfig: unknown;
  simulatedState: string | null;
  simulatedStateAt: Date | null;
}

export interface TelemetryReading {
  timestamp: Date;
  intervalSeconds: number;
  /** O'rtacha quvvat, kW */
  powerKw: number;
  /** Interval ichidagi energiya, kWh */
  energyKwh: number;
}

export interface ProductionReading {
  timestamp: Date;
  isProducing: boolean;
  count?: number | null;
}

export interface ProviderBatch {
  telemetry: TelemetryReading[];
  signals: ProductionReading[];
}

export interface SensorDataProvider {
  readonly id: string;
  readonly name: string;
  readonly source: SourceKind;
  /** pull — server o'zi so'raydi; push — tashqi tizim yuboradi (HTTP ingest). */
  readonly mode: 'pull' | 'push';
  /** Adapter haqiqatan amalga oshirilganmi. false bo'lsa UI "ulanmagan" deb ko'rsatadi. */
  readonly implemented: boolean;
  readonly description: string;
  pull?(equipment: ProviderEquipment, from: Date, to: Date, timeZone: string): ProviderBatch;
}
