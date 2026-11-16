import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { parseJsonSafe } from "@/lib/utils";
import { decryptSafe } from "@/lib/encryption";
import { readEncryptedFile, deleteEncryptedFile, mimeFromName } from "@/lib/storage";
import type { LabReportAIResult } from "@/types";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth();

  const report = await prisma.labReport.findFirst({
    where: { id: params.id, userId: user.id },
  });

  if (!report) {
    return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  }

  // Download encrypted original file if ?download=true
  if (req.nextUrl.searchParams.get("download") === "true" && report.fileUrl) {
    const fileBuffer = await readEncryptedFile(report.fileUrl);
    if (fileBuffer) {
      const fileName = report.fileName || `lab-report-${report.id}.pdf`;
      return new NextResponse(new Uint8Array(fileBuffer), {
        headers: {
          "Content-Type": mimeFromName(fileName),
          "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        },
      });
    }
  }

  const aiResult = parseJsonSafe<LabReportAIResult>(
    report.aiExplanationJson,
    {} as LabReportAIResult
  );

  return NextResponse.json({
    data: {
      id: report.id,
      fileName: report.fileName,
      hasUrgentValues: report.hasUrgentValues,
      extractedText: decryptSafe(report.extractedText),
      createdAt: report.createdAt,
      aiResult,
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth();

  const existing = await prisma.labReport.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (existing?.fileUrl) {
    await deleteEncryptedFile(existing.fileUrl);
  }

  await prisma.labReport.deleteMany({
    where: { id: params.id, userId: user.id },
  });

  return NextResponse.json({ ok: true });
}
