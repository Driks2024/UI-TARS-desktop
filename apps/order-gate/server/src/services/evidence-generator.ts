import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { ValidationResult } from './policy-engine';

export const generateEvidencePdf = async (
  validationResult: ValidationResult,
  orderNumber: string,
  outputDir: string
): Promise<string> => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 50;
  const margin = 50;

  // Header
  page.drawText(`Evidence Report - Order ${orderNumber}`, {
    x: margin,
    y: y,
    size: 20,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });
  y -= 30;

  const dateStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  page.drawText(`Generated on: ${dateStr}`, {
    x: margin,
    y: y,
    size: 10,
    font: helveticaFont,
    color: rgb(0.5, 0.5, 0.5),
  });
  y -= 40;

  // Status
  page.drawText(`Status: ${validationResult.status}`, {
    x: margin,
    y: y,
    size: 14,
    font: helveticaBold,
    color: validationResult.status === 'APPROVED' ? rgb(0, 0.8, 0) : rgb(0.8, 0, 0),
  });
  y -= 30;

  // Reasons
  if (validationResult.reasons.length > 0) {
    page.drawText('Blocking Violations:', {
      x: margin,
      y: y,
      size: 12,
      font: helveticaBold,
      color: rgb(0.8, 0, 0),
    });
    y -= 20;

    for (const reason of validationResult.reasons) {
      // Simple word wrap logic or truncate
      const lines = wrapText(reason, width - 2 * margin, helveticaFont, 10);
      for (const line of lines) {
        if (y < 50) {
            // New page logic needed here for robust solution, but skipping for MVP
        }
        page.drawText(`- ${line}`, {
          x: margin + 10,
          y: y,
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
        y -= 15;
      }
      y -= 5;
    }
  }

  // Warnings
  if (validationResult.warnings.length > 0) {
    y -= 20;
    page.drawText('Warnings:', {
      x: margin,
      y: y,
      size: 12,
      font: helveticaBold,
      color: rgb(1, 0.5, 0),
    });
    y -= 20;

    for (const warning of validationResult.warnings) {
      const lines = wrapText(warning, width - 2 * margin, helveticaFont, 10);
      for (const line of lines) {
        page.drawText(`- ${line}`, {
          x: margin + 10,
          y: y,
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
        y -= 15;
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  const filename = `evidence_${orderNumber}_${Date.now()}.pdf`;
  const filePath = path.join(outputDir, filename);

  fs.writeFileSync(filePath, pdfBytes);

  return filePath;
};

// Helper for text wrapping
function wrapText(text: string, maxWidth: number, font: any, fontSize: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = font.widthOfTextAtSize(currentLine + " " + word, fontSize);
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}
