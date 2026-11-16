// OCR — Tesseract.js (runs in Node via worker)
// For production, consider Google Cloud Vision or AWS Textract for better accuracy

import Tesseract from "tesseract.js";

export async function extractTextFromImage(
  imageBuffer: Buffer,
  lang = "eng+rus"
): Promise<string> {
  const { data: { text } } = await Tesseract.recognize(imageBuffer, lang, {
    logger: () => {}, // suppress progress logs
  });
  return text.trim();
}

export async function extractTextFromBase64(
  base64: string,
  mimeType: string,
  lang = "eng+rus"
): Promise<string> {
  const dataUrl = `data:${mimeType};base64,${base64}`;
  const { data: { text } } = await Tesseract.recognize(dataUrl, lang, {
    logger: () => {},
  });
  return text.trim();
}

// Extract text from PDF using pdfjs-dist
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    // Dynamic import to avoid issues with SSR
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs" as never) as typeof import("pdfjs-dist");

    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) });
    const pdf = await loadingTask.promise;

    const textParts: string[] = [];
    for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      textParts.push(pageText);
    }

    const text = textParts.join("\n").trim();
    return text;
  } catch (error) {
    console.error("PDF extraction failed:", error);
    return "";
  }
}

// Auto-detect file type and extract text
export async function extractText(
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === "application/pdf") {
    const pdfText = await extractTextFromPDF(fileBuffer);
    if (pdfText.length > 50) return pdfText;
    // PDF might be scanned — try OCR on it
    return extractTextFromImage(fileBuffer);
  }

  if (mimeType.startsWith("image/")) {
    return extractTextFromImage(fileBuffer);
  }

  return "";
}

// Clean up OCR noise
export function cleanOCRText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/[^\w\s\d.,;:()\-+%/<>=°]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
