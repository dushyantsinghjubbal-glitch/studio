'use server';

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function generatePdfAction(): Promise<{ file: string; fileName: string; }> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const title = 'My Awesome Document';
  const titleSize = 24;
  const titleWidth = boldFont.widthOfTextAtSize(title, titleSize);

  page.drawText(title, {
    x: (width - titleWidth) / 2,
    y: height - 100,
    font: boldFont,
    size: titleSize,
    color: rgb(0, 0.53, 0.71),
  });

  const content = [
    'This is a sample PDF document generated with pdf-lib.',
    'You can add text, images, and custom fonts to create beautiful PDFs.',
    'This example demonstrates basic text formatting and positioning.',
  ];

  let y = height - 160;
  for (const line of content) {
    page.drawText(line, {
      x: 50,
      y,
      font,
      size: 12,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 20;
  }

  const pdfBytes = await pdfDoc.save();
  const file = Buffer.from(pdfBytes).toString('base64');
  const fileName = 'document.pdf';

  // Simulate some server-side processing time
  await new Promise(resolve => setTimeout(resolve, 750));

  return { file, fileName };
}
