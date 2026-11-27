import 'dotenv/config';
import { execSync } from 'node:child_process';
import pg from 'pg';

/**
 * Test bazasini tayyorlaydi: migratsiyalarni qo'llaydi va jadvallarni tozalaydi.
 * Xavfsizlik: TEST_DATABASE_URL development DATABASE_URL bilan bir xil bo'lsa — to'xtaydi.
 */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    console.warn('[tests] TEST_DATABASE_URL yo‘q — integratsion testlar o‘tkazib yuboriladi');
    return;
  }
  if (url === process.env.DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL development bazasi bilan bir xil bo‘lmasligi kerak');
  }
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: url } });
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  const { rows } = await client.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
  );
  if (rows.length) await client.query(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`);
  await client.end();
}
