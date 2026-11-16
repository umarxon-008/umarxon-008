import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { extractText, cleanOCRText } from "@/lib/ocr";
import { explainLabReport } from "@/lib/ai";
import { encrypt } from "@/lib/encryption";
import { saveEncryptedFile } from "@/lib/storage";

// GET /api/lab-reports
export async function GET() {
  const user = await requireAuth();

  const reports = await prisma.labReport.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileName: true,
      hasUrgentValues: true,
      createdAt: true,
      aiExplanationJson: true,
    },
  });

  return NextResponse.json({ data: reports });
}

// POST /api/lab-reports — upload and analyze
export async function POST(req: NextRequest) {
  const user = await requireAuth();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Fayl yuklanmadi" }, { status: 400 });
  }

  const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Faqat PDF, JPG, PNG formatlar qabul qilinadi" },
      { status: 422 }
    );
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Fayl hajmi 10 MB dan oshmasin" },
      { status: 422 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Save encrypted original file (AES-256-GCM)
  const stored = await saveEncryptedFile(user.id, buffer, file.name);

  // OCR
  const rawText = await extractText(buffer, file.type);
  const cleanText = cleanOCRText(rawText);

  if (!cleanText) {
    return NextResponse.json(
      { error: "Fayldan matn o'qib bo'lmadi. Iltimos rasmni yaxshiroq formatda yuboring." },
      { status: 422 }
    );
  }

  // AI analysis (with PII redaction and deterministic marker status verification)
  const aiResult = await explainLabReport(cleanText);

  const hasUrgent =
    Boolean(aiResult?.urgent_markers && aiResult.urgent_markers.length > 0) ||
    Boolean(aiResult?.markers?.some((m) => m.isUrgent));

  const report = await prisma.labReport.create({
    data: {
      userId: user.id,
      fileName: file.name,
      fileUrl: stored.key,
      extractedText: encrypt(cleanText),
      parsedMarkersJson: aiResult ? JSON.stringify(aiResult.markers) : null,
      aiExplanationJson: aiResult ? JSON.stringify(aiResult) : null,
      hasUrgentValues: hasUrgent,
    },
  });

  return NextResponse.json(
    { data: { id: report.id, aiResult } },
    { status: 201 }
  );
}
