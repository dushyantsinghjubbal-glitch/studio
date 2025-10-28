'use server';
/**
 * @fileOverview An AI flow to recognize tenant and payment amount from a screenshot.
 *
 * - recognizeTenantPayment - A function that handles the tenant payment recognition process.
 * - RecognizeTenantPaymentInput - The input type for the function.
 * - RecognizeTenantPaymentOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TenantInfoSchema = z.object({
    name: z.string().describe('The name of the tenant.'),
    rentAmount: z.number().describe('The expected rent amount for the tenant.')
});

export const RecognizeTenantPaymentInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a payment screenshot, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  tenants: z.array(TenantInfoSchema).describe('A list of possible tenants and their expected rent.'),
});
export type RecognizeTenantPaymentInput = z.infer<typeof RecognizeTenantPaymentInputSchema>;

export const RecognizeTenantPaymentOutputSchema = z.object({
  tenantName: z.string().describe('The name of the tenant identified from the screenshot.'),
  amount: z.number().describe("The payment amount identified from the screenshot."),
});
export type RecognizeTenantPaymentOutput = z.infer<typeof RecognizeTenantPaymentOutputSchema>;

export async function recognizeTenantPayment(input: RecognizeTenantPaymentInput): Promise<RecognizeTenantPaymentOutput> {
  return recognizeTenantPaymentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recognizeTenantPaymentPrompt',
  input: {schema: RecognizeTenantPaymentInputSchema},
  output: {schema: RecognizeTenantPaymentOutputSchema},
  prompt: `You are an expert at reading payment screenshots for a rent management app.
Your task is to identify the tenant's name and the amount paid from the provided screenshot.

Here is the list of potential tenants and their expected rent:
{{#each tenants}}
- Name: {{name}}, Expected Rent: {{rentAmount}}
{{/each}}

Analyze the attached screenshot. The screenshot may contain names, bank transfer details, or other payment app information.
- From the text in the screenshot, determine which tenant made the payment. Match the name to one of the tenants in the list provided.
- Extract the exact payment amount.
- Return the matched tenant's name and the extracted amount.

If you cannot confidently determine the tenant or the amount, make your best guess.

Screenshot: {{media url=photoDataUri}}`,
});

const recognizeTenantPaymentFlow = ai.defineFlow(
  {
    name: 'recognizeTenantPaymentFlow',
    inputSchema: RecognizeTenantPaymentInputSchema,
    outputSchema: RecognizeTenantPaymentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
