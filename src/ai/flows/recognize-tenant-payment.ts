'use server';
/**
 * @fileOverview An AI flow to recognize transaction details from a receipt.
 *
 * - recognizeTransaction - A function that handles the transaction recognition process.
 * - RecognizeTransactionInput - The input type for the function.
 * - RecognizeTransactionOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecognizeTransactionInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a receipt or invoice, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  context: z.string().describe("Context about what kind of transaction this is, e.g. 'Rent payment' or 'Grocery receipt'"),
});
export type RecognizeTransactionInput = z.infer<typeof RecognizeTransactionInputSchema>;

const RecognizeTransactionOutputSchema = z.object({
  title: z.string().describe('A short, descriptive title for the transaction, like "Monthly Rent" or "Grocery Shopping".'),
  amount: z.number().describe("The total amount of the transaction found on the receipt."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format.").describe('The date of the transaction in YYYY-MM-DD format.'),
  category: z.enum(['Rent Received', 'Utilities', 'Maintenance', 'Salary', 'Groceries', 'Other']).describe('The category of the transaction.'),
  merchant: z.string().optional().describe("The merchant or brand name if visible on the receipt (e.g., 'Starbucks', 'Nike')."),
});
export type RecognizeTransactionOutput = z.infer<typeof RecognizeTransactionOutputSchema>;

export async function recognizeTransaction(input: RecognizeTransactionInput): Promise<RecognizeTransactionOutput> {
  return recognizeTransactionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recognizeTransactionPrompt',
  input: {schema: RecognizeTransactionInputSchema},
  output: {schema: RecognizeTransactionOutputSchema},
  prompt: `You are an expert financial assistant for an app called FinProp. Your task is to extract transaction details from a user-uploaded receipt image.

Context provided by user: {{{context}}}

Based on the context and the content of the receipt image, extract the following information and return it in the specified JSON format.
1.  **title**: Create a brief, clear title for the transaction.
2.  **amount**: Find the total numerical amount paid.
3.  **date**: Find the date of the transaction and format it as YYYY-MM-DD.
4.  **category**: Analyze the receipt to determine if it is for money received (income) or money spent (expense).
    - If it is income (like a rent payment receipt), classify it as 'Rent Received'.
    - Otherwise, categorize the transaction into one of the following: 'Utilities', 'Maintenance', 'Salary', 'Groceries', 'Other'.
5.  **merchant**: If a clear merchant name or brand (like 'Nike', 'Starbucks', 'Walmart') is visible, extract it. Otherwise, omit this field.

Analyze the attached image.

Receipt Image: {{media url=photoDataUri}}`,
});

const recognizeTransactionFlow = ai.defineFlow(
  {
    name: 'recognizeTransactionFlow',
    inputSchema: RecognizeTransactionInputSchema,
    outputSchema: RecognizeTransactionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
