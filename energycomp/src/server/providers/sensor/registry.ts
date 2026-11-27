import { demoDataProvider } from './demo';
import type { SensorDataProvider } from './types';

/** HTTP ingest — tashqi gateway POST /api/ingest ga Bearer token bilan o'lchov yuboradi. */
export const httpIngestProvider: SensorDataProvider = {
  id: 'http-ingest',
  name: 'HTTP Ingest API',
  source: 'REAL',
  mode: 'push',
  implemented: true,
  description:
    "Gateway yoki skript o'lchovlarni JSON ko'rinishida POST /api/ingest ga yuboradi. Uskunaning sensorId maydoni bo'yicha bog'lanadi.",
};

export const mqttProvider: SensorDataProvider = {
  id: 'mqtt',
  name: 'MQTT broker',
  source: 'REAL',
  mode: 'push',
  implemented: false,
  description: "Rejalashtirilgan adapter. Hozircha mavjud emas — MQTT orqali ulanish yo'q.",
};

export const modbusProvider: SensorDataProvider = {
  id: 'modbus',
  name: 'Modbus TCP gateway',
  source: 'REAL',
  mode: 'pull',
  implemented: false,
  description: "Rejalashtirilgan adapter. Hozircha mavjud emas — Modbus orqali ulanish yo'q.",
};

export const SENSOR_PROVIDERS: SensorDataProvider[] = [demoDataProvider, httpIngestProvider, mqttProvider, modbusProvider];
