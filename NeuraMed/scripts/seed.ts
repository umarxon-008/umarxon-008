// Run: npm run db:seed
// Seeds the database with test data

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // Create test user
  const passwordHash = await bcrypt.hash("Test12345!", 12);

  const user = await prisma.user.upsert({
    where: { email: "test@neuramed.uz" },
    update: {},
    create: {
      name: "Alisher Testov",
      email: "test@neuramed.uz",
      passwordHash,
      age: 30,
      gender: "MALE",
      heightCm: 175,
      weightKg: 75,
      language: "uz",
    },
  });

  console.log(`✅ User created: ${user.email}`);

  // Create test medications cache
  const paracetamol = await prisma.medication.upsert({
    where: { rxcui: "41493" },
    update: {},
    create: {
      name: "Acetaminophen",
      genericName: "acetaminophen",
      form: "Tabletka",
      rxcui: "41493",
      sourceProvider: "openFDA",
      sourceUrl: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=example",
      lastUpdated: "2024-01-01",
      simplifiedInfoJson: JSON.stringify({
        drug_name: "Paracetamol (Acetaminophen)",
        generic_name: "acetaminophen",
        brand_names: ["Tylenol", "Panadol"],
        form: "Tabletka",
        purpose: "Og'riq qoldiruvchi va harorat tushiruvchi. Bosh og'riq, mushaklarning og'rishi, harorat kabi holatlarda qo'llaniladi.",
        how_to_take: "Suv bilan yuting. Tabletkani chaqib bo'lmaydi, butunligicha yuting.",
        timing: "Har 4-6 soatda bir marta",
        food_rule: "ahamiyatsiz",
        food_rule_note: "Ovqat bilan yoki bo'sh qorin — muhim emas",
        frequency: "Kuniga 3-4 marta",
        dosage: "500 mg — 1 g (1-2 tabletka)",
        missed_dose: "Dozani o'tkazib yuborsangiz, eslaganingizda oling. Keyingi doza vaqti yaqin bo'lsa, o'tkazib yuborilgan dozani olmasdan davom eting. Ikki dozani bir vaqtda olmang.",
        common_side_effects: [
          "Juda kam hollarda: jigar muammolari (katta dozada)",
          "Allergik reaktsiya (kam uchraydi)",
          "Ko'ngil aynishi (kam)"
        ],
        serious_warnings: [
          "Paracetamol boshqa dorilarda ham bo'lishi mumkin — umumiy miqdorga e'tibor bering",
          "Sutkalik maksimal doza: 4 g (kattalar uchun)",
          "Jigar kasalligi bo'lsa ehtiyot bo'ling"
        ],
        avoid_with: [
          "Alkogol — jigar zararlanishi xavfi ortadi",
          "Boshqa paracetamol o'z ichiga olgan dorilar"
        ],
        lifestyle_warnings: {
          alcohol: "Alkogol bilan birga olmang — jigar zararlanishi xavfi ortadi",
          pregnancy: "Homiladorlikda shifokor ko'rsatmasi bilan ishlatilishi mumkin",
          breastfeeding: "Shifokor bilan maslahatlashing",
          driving: "Odatda ta'sir qilmaydi",
          liver: "Jigar kasalligi bo'lsa, shifokorga ayting",
          kidney: "Buyrak kasalligi bo'lsa, shifokorga ayting"
        },
        when_to_call_doctor: [
          "3 kundan ko'proq isitma",
          "Sariqlik (teri yoki ko'z oqining sarg'ayishi)",
          "Qorin og'rig'i",
          "Og'riq yaxshilanmasa"
        ],
        disclaimer: "Bu umumiy ma'lumot, tashxis yoki davolash bo'yicha shifokor maslahati emas.",
        source: {
          provider: "openFDA",
          url: "https://www.accessdata.fda.gov/scripts/cder/daf/",
          last_updated: "2024-01-01"
        }
      }),
    },
  });

  console.log(`✅ Medication cached: ${paracetamol.name}`);

  // Create test reminder
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 30);

  const reminder = await prisma.reminder.create({
    data: {
      userId: user.id,
      medicationId: paracetamol.id,
      medicationName: "Paracetamol",
      dose: "500 mg",
      timesPerDay: 2,
      scheduleJson: JSON.stringify([
        { time: "08:00", label: "Ertalab" },
        { time: "20:00", label: "Kechqurun" },
      ]),
      foodRule: "ahamiyatsiz",
      startDate: new Date(),
      endDate: tomorrow,
      notificationType: "PUSH",
      notes: "Ovqat oldidan yoki keyin iching",
    },
  });

  console.log(`✅ Reminder created: ${reminder.medicationName}`);

  console.log("\n🎉 Seed complete!\n");
  console.log("Test credentials:");
  console.log("  Email: test@neuramed.uz");
  console.log("  Password: Test12345!\n");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
