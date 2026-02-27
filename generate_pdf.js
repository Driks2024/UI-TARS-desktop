const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');

async function createPdf() {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const fontSize = 12;

  page.drawText('ORCAMENTO: 12345', {
    x: 50,
    y: height - 4 * fontSize,
    size: fontSize,
    font: timesRomanFont,
    color: rgb(0, 0, 0),
  });

  page.drawText('CLIENTE: Test Client - 12.345.678/0001-90', {
    x: 50,
    y: height - 6 * fontSize,
    size: fontSize,
    font: timesRomanFont,
  });

  page.drawText('CODIGO DESCRICAO NCM QTD UNIT TOTAL', {
    x: 50,
    y: height - 8 * fontSize,
    size: fontSize,
    font: timesRomanFont,
  });

  // Item with low price (should fail min price check)
  // 1801.001 Min Price is 6.50
  page.drawText('1801.001 PRODUCT_A 12345678 10 5,00 50,00', {
    x: 50,
    y: height - 10 * fontSize,
    size: fontSize,
    font: timesRomanFont,
  });

  // Item with ok price
  page.drawText('1801.002 PRODUCT_B 87654321 5 10,00 50,00', {
    x: 50,
    y: height - 12 * fontSize,
    size: fontSize,
    font: timesRomanFont,
  });

  page.drawText('TOTAL: R$ 100,00', {
    x: 50,
    y: height - 14 * fontSize,
    size: fontSize,
    font: timesRomanFont,
  });

  page.drawText('VENCIMENTO: 30/60/90', {
     x: 50,
     y: height - 16 * fontSize,
     size: fontSize,
     font: timesRomanFont,
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('sample_order.pdf', pdfBytes);
}

createPdf();
