import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgAvailable: boolean | undefined;
};

const DB_FILE = path.join(process.cwd(), "storage", "local-dev-db.json");

interface LocalDB {
  user: Record<string, any>[];
  session: Record<string, any>[];
  medication: Record<string, any>[];
  reminder: Record<string, any>[];
  doseLog: Record<string, any>[];
  labReport: Record<string, any>[];
  imagingReport: Record<string, any>[];
  doctorVisitPrep: Record<string, any>[];
  // MEDPERFECT modullari
  appointment: Record<string, any>[];
  doctorMessage: Record<string, any>[];
  traceReport: Record<string, any>[];
  // Salomatligim
  healthCard: Record<string, any>[];
  vitalReading: Record<string, any>[];
  checkup: Record<string, any>[];
  checkupNote: Record<string, any>[];
}

const EXTRA_TABLES = ["appointment", "doctorMessage", "traceReport", "healthCard", "vitalReading", "checkup", "checkupNote"] as const;

function getInitialLocalDB(): LocalDB {
  const now = new Date().toISOString();
  const testUserId = "usr_neuramed_demo";
  const rem1Id = "rem_paracetamol_demo";
  const rem2Id = "rem_omeprazole_demo";

  return {
    user: [
      {
        id: testUserId,
        name: "Aziza Karimova",
        email: "test@neuramed.uz",
        phone: "+998901234567",
        // bcrypt hash for "Test12345!"
        passwordHash: bcrypt.hashSync("Test12345!", 10),
        age: 29,
        gender: "FEMALE",
        heightCm: 165,
        weightKg: 60,
        allergiesJson: JSON.stringify(["Penitsillin"]),
        chronicConditionsJson: JSON.stringify(["Temir tanqisligi anemiyasi"]),
        currentMedicationsJson: null,
        pregnancyStatus: "NOT_APPLICABLE",
        emergencyContact: JSON.stringify({ name: "Karim Karimov (turmush oʻrtogʻi)", phone: "+998 90 000 00 00" }),
        language: "uz",
        pushSubscriptionJson: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
    ],
    session: [],
    medication: [],
    reminder: [
      {
        id: rem1Id,
        userId: testUserId,
        medicationId: null,
        medicationName: "Paracetamol",
        dose: "500 mg",
        timesPerDay: 2,
        scheduleJson: JSON.stringify([
          { time: "08:00", label: "Ertalab" },
          { time: "20:00", label: "Kechqurun" },
        ]),
        foodRule: "ovqat_bilan",
        startDate: now,
        endDate: null,
        status: "ACTIVE",
        notificationType: "PUSH",
        notes: "Ovqatdan keyin 1 stakan suv bilan",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: rem2Id,
        userId: testUserId,
        medicationId: null,
        medicationName: "Omeprazole",
        dose: "20 mg",
        timesPerDay: 1,
        scheduleJson: JSON.stringify([{ time: "07:30", label: "Ertalab" }]),
        foodRule: "bosh_qorin",
        startDate: now,
        endDate: null,
        status: "ACTIVE",
        notificationType: "BOTH",
        notes: "Nonushtadan 30 daqiqa oldin",
        createdAt: now,
        updatedAt: now,
      },
    ],
    doseLog: [
      {
        id: "log_demo_1",
        reminderId: rem1Id,
        scheduledAt: now,
        status: "TAKEN",
        takenAt: now,
        note: "Vaqtida qabul qilindi",
        createdAt: now,
      },
    ],
    labReport: [],
    imagingReport: [],
    doctorVisitPrep: [],
    appointment: [],
    doctorMessage: [],
    traceReport: [],
    healthCard: [],
    vitalReading: [],
    checkup: [],
    checkupNote: [],
  };
}

function loadLocalDB(): LocalDB {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf8");
      const db = JSON.parse(raw) as LocalDB;
      // Eski fayllarda yangi jadvallar bo'lmasligi mumkin
      const hadCard = Array.isArray((db as any).healthCard);
      for (const t of EXTRA_TABLES) if (!Array.isArray((db as any)[t])) (db as any)[t] = [];
      // Demo hisob uchun tibbiy karta namunalari (faqat bir marta, bo'sh bo'lsa)
      const demo = db.user.find((u) => u.id === "usr_neuramed_demo");
      if (!hadCard && demo) {
        demo.allergiesJson ??= JSON.stringify(["Penitsillin"]);
        demo.chronicConditionsJson ??= JSON.stringify(["Temir tanqisligi anemiyasi"]);
        demo.emergencyContact ??= JSON.stringify({ name: "Karim Karimov (turmush oʻrtogʻi)", phone: "+998 90 000 00 00" });
      }
      return db;
    }
  } catch {
    // ignore
  }
  const initial = getInitialLocalDB();
  saveLocalDB(initial);
  return initial;
}

function saveLocalDB(db: LocalDB) {
  try {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
  } catch {
    // ignore
  }
}

function reviveDates(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(reviveDates);
  const copy: Record<string, any> = { ...obj };
  for (const k of [
    "createdAt",
    "updatedAt",
    "deletedAt",
    "expiresAt",
    "startDate",
    "endDate",
    "scheduledAt",
    "takenAt",
    "notifReadAt",
  ]) {
    if (typeof copy[k] === "string") {
      copy[k] = new Date(copy[k]);
    }
  }
  return copy;
}

function matchesWhere(row: Record<string, any>, where?: Record<string, any>): boolean {
  if (!where) return true;
  for (const [k, v] of Object.entries(where)) {
    if (v === undefined) continue;
    if (k === "OR" && Array.isArray(v)) {
      if (!v.some((cond) => matchesWhere(row, cond))) return false;
      continue;
    }
    if (k === "AND" && Array.isArray(v)) {
      if (!v.every((cond) => matchesWhere(row, cond))) return false;
      continue;
    }
    if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
      if ("not" in v) {
        if (row[k] === v.not) return false;
        continue;
      }
      if ("in" in v && Array.isArray(v.in)) {
        if (!v.in.includes(row[k])) return false;
        continue;
      }
      if ("contains" in v && typeof v.contains === "string") {
        const hay = String(row[k] ?? "").toLowerCase();
        const needle = v.contains.toLowerCase();
        if (!hay.includes(needle)) return false;
        continue;
      }
      if ("equals" in v && typeof v.equals === "string") {
        if (String(row[k] ?? "").toLowerCase() !== v.equals.toLowerCase()) return false;
        continue;
      }
    }
    if (row[k] !== v) return false;
  }
  return true;
}

function attachIncludes(
  table: keyof LocalDB,
  row: Record<string, any>,
  include?: Record<string, any>,
  db?: LocalDB
): Record<string, any> {
  if (!include || !db) return reviveDates(row);
  const copy = reviveDates(row);
  if (table === "session" && include.user) {
    copy.user = reviveDates(db.user.find((u) => u.id === row.userId) || null);
  }
  if (table === "reminder" && include.doseLogs) {
    copy.doseLogs = db.doseLog
      .filter((d) => d.reminderId === row.id)
      .map(reviveDates)
      .reverse();
  }
  if (table === "reminder" && include.medication) {
    copy.medication = reviveDates(
      db.medication.find((m) => m.id === row.medicationId) || null
    );
  }
  return copy;
}

function createFallbackModel(table: keyof LocalDB) {
  return {
    async findUnique(args?: any) {
      const db = loadLocalDB();
      const row = db[table].find((r) => matchesWhere(r, args?.where));
      if (!row) return null;
      return attachIncludes(table, row, args?.include, db);
    },
    async findFirst(args?: any) {
      const db = loadLocalDB();
      const row = db[table].find((r) => matchesWhere(r, args?.where));
      if (!row) return null;
      return attachIncludes(table, row, args?.include, db);
    },
    async findMany(args?: any) {
      const db = loadLocalDB();
      let rows = db[table].filter((r) => matchesWhere(r, args?.where));
      if (args?.orderBy) {
        rows = [...rows].reverse();
      }
      if (typeof args?.take === "number") {
        rows = rows.slice(0, args.take);
      }
      return rows.map((r) => attachIncludes(table, r, args?.include, db));
    },
    async create(args: any) {
      const db = loadLocalDB();
      const now = new Date().toISOString();
      const record: Record<string, any> = {
        id: args.data?.id || `${table}_${crypto.randomUUID().slice(0, 10)}`,
        createdAt: now,
        updatedAt: now,
        ...args.data,
      };
      for (const [k, v] of Object.entries(record)) {
        if (v instanceof Date) record[k] = v.toISOString();
      }
      db[table].push(record);
      saveLocalDB(db);
      return attachIncludes(table, record, args?.include, db);
    },
    async update(args: any) {
      const db = loadLocalDB();
      const idx = db[table].findIndex((r) => matchesWhere(r, args?.where));
      if (idx === -1) throw new Error(`${table} record not found`);
      const updated: Record<string, any> = { ...db[table][idx], updatedAt: new Date().toISOString() };
      for (const [k, v] of Object.entries(args.data || {})) {
        if (v !== undefined) {
          updated[k] = v instanceof Date ? v.toISOString() : v;
        }
      }
      db[table][idx] = updated;
      saveLocalDB(db);
      return reviveDates(updated);
    },
    async updateMany(args: any) {
      const db = loadLocalDB();
      let count = 0;
      db[table] = db[table].map((r) => {
        if (!matchesWhere(r, args?.where)) return r;
        count++;
        const updated: Record<string, any> = { ...r, updatedAt: new Date().toISOString() };
        for (const [k, v] of Object.entries(args.data || {})) {
          if (v !== undefined) {
            updated[k] = v instanceof Date ? v.toISOString() : v;
          }
        }
        return updated;
      });
      saveLocalDB(db);
      return { count };
    },
    async upsert(args: any) {
      const db = loadLocalDB();
      const idx = db[table].findIndex((r) => matchesWhere(r, args?.where));
      if (idx !== -1) {
        return this.update({ where: args.where, data: args.update });
      }
      return this.create({ data: args.create });
    },
    async delete(args: any) {
      const db = loadLocalDB();
      const idx = db[table].findIndex((r) => matchesWhere(r, args?.where));
      if (idx === -1) return null;
      const [removed] = db[table].splice(idx, 1);
      saveLocalDB(db);
      return reviveDates(removed);
    },
    async deleteMany(args: any) {
      const db = loadLocalDB();
      const before = db[table].length;
      db[table] = db[table].filter((r) => !matchesWhere(r, args?.where));
      saveLocalDB(db);
      return { count: before - db[table].length };
    },
  };
}

const rawPrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = rawPrisma;
}

function wrapModel(table: keyof LocalDB, realDelegate: any) {
  const fallback = createFallbackModel(table);
  return new Proxy(realDelegate, {
    get(target, prop: string) {
      if (typeof (fallback as any)[prop] === "function") {
        return async (...args: any[]) => {
          if (globalForPrisma.pgAvailable === false) {
            return (fallback as any)[prop](...args);
          }
          try {
            const res = await target[prop](...args);
            globalForPrisma.pgAvailable = true;
            return res;
          } catch (err: any) {
            const msg = String(err?.message || "");
            if (
              msg.includes("Can't reach database server") ||
              msg.includes("ECONNREFUSED") ||
              err?.name === "PrismaClientInitializationError"
            ) {
              globalForPrisma.pgAvailable = false;
              return (fallback as any)[prop](...args);
            }
            throw err;
          }
        };
      }
      return target[prop];
    },
  });
}

export const prisma = new Proxy(rawPrisma, {
  get(target, prop: string) {
    if (
      [
        "user",
        "session",
        "medication",
        "reminder",
        "doseLog",
        "labReport",
        "imagingReport",
        "doctorVisitPrep",
        ...EXTRA_TABLES,
      ].includes(prop)
    ) {
      return wrapModel(prop as keyof LocalDB, (target as any)[prop]);
    }
    if (prop === "$transaction") {
      return async (ops: any[]) => Promise.all(ops);
    }
    return (target as any)[prop];
  },
}) as PrismaClient;

export default prisma;
