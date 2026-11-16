import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { parseJsonSafe } from "@/lib/utils";
import type { ImagingReportAIResult } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await requireAuth();

  const report = await prisma.imagingReport.findFirst({
    where: { id: params.id, userId: user.id },
  });

  if (!report) {
    return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  }

  const aiResult = parseJsonSafe<ImagingReportAIResult>(
    report.aiExplanationJson,
    {} as ImagingReportAIResult
  );

  return NextResponse.json({
    data: {
      id: report.id,
      fileName: report.fileName,
      reportType: report.reportType,
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
  await prisma.imagingReport.deleteMany({
    where: { id: params.id, userId: user.id },
  });
  return NextResponse.json({ ok: true });
}
