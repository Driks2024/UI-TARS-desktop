import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

export const stampPdf = async (
  originalPdfPath: string,
  status: 'APPROVED' | 'REJECTED' | 'EXCEPTION',
  stampId: string,
  orderHash: string
): Promise<string> => {
  const existingPdfBytes = fs.readFileSync(originalPdfPath);

  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();

  // Color based on status
  let color = rgb(0, 0.8, 0); // Green
  if (status === 'REJECTED') color = rgb(0.8, 0, 0); // Red
  if (status === 'EXCEPTION') color = rgb(1, 0.5, 0); // Orange

  const dateStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  // Main Stamp Text
  firstPage.drawText(status, {
    x: width / 2 - 100,
    y: height - 100,
    size: 40,
    font: helveticaFont,
    color: color,
    rotate: degrees(45),
    opacity: 0.6,
  });

  // Stamp Details
  firstPage.drawText(`ID: ${stampId}`, {
    x: 50,
    y: height - 30,
    size: 10,
    font: helveticaFont,
    color: rgb(0, 0, 0),
  });

  firstPage.drawText(`Order Hash: ${orderHash.substring(0, 8)}`, {
    x: 50,
    y: height - 45,
    size: 10,
    font: helveticaFont,
    color: rgb(0, 0, 0),
  });

  firstPage.drawText(`Processed: ${dateStr}`, {
    x: 50,
    y: height - 60,
    size: 10,
    font: helveticaFont,
    color: rgb(0, 0, 0),
  });

  // Footer on all pages
  for (const page of pages) {
    const { width, height } = page.getSize();
    page.drawText(`Processed by Order Gate on ${dateStr}`, {
      x: 50,
      y: 20,
      size: 8,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  const pdfBytes = await pdfDoc.save();

  const originalDir = path.dirname(originalPdfPath);
  const stampedFilename = `stamped_${stampId}.pdf`;
  const stampedPath = path.join(originalDir, stampedFilename);

  fs.writeFileSync(stampedPath, pdfBytes);

  return stampedPath;
};
