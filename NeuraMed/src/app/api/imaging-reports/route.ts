import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { extractText, cleanOCRText } from "@/lib/ocr";
import { explainImagingReport } from "@/lib/ai";
import { encrypt } from "@/lib/encryption";
import { saveEncryptedFile } from "@/lib/storage";

export async function GET() {
  const user = await requireAuth();

  const reports = await prisma.imagingReport.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileName: true,
      reportType: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: reports });
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const reportType = (formData.get("reportType") as string) || "X-Ray";

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

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const stored = await saveEncryptedFile(user.id, buffer, file.name);

  const rawText = await extractText(buffer, file.type);
  const cleanText = cleanOCRText(rawText);

  if (!cleanText) {
    return NextResponse.json(
      { error: "Fayldan matn o'qib bo'lmadi." },
      { status: 422 }
    );
  }

  const aiResult = await explainImagingReport(cleanText);

  const report = await prisma.imagingReport.create({
    data: {
      userId: user.id,
      fileName: file.name,
      fileUrl: stored.key,
      reportType,
      extractedText: encrypt(cleanText),
      aiExplanationJson: aiResult ? JSON.stringify(aiResult) : null,
    },
  });

  return NextResponse.json(
    { data: { id: report.id, aiResult } },
    { status: 201 }
  );
}
