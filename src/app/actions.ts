'use server';

import { Buffer } from 'buffer';

export async function generatePdfAction(): Promise<{ file: string; fileName:string; }> {
  // In a real application, you would use a library like `pdf-lib` to generate a real PDF document.
  // Due to the constraints of this environment, we are creating a simple text content
  // and presenting it as a PDF file for download.
  const content = 'Hello';
  const file = Buffer.from(content, 'utf-8').toString('base64');
  const fileName = 'hello.pdf';

  // Simulate some server-side processing time to make the loading state visible
  await new Promise(resolve => setTimeout(resolve, 750));

  return { file, fileName };
}
