import 'dotenv/config';

// Integratsion testlar faqat alohida test bazasida ishlaydi — hech qachon development bazasida emas.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
process.env.AI_PROVIDER = 'rule-based';
process.env.DEMO_DATA_ENABLED = 'true';
