// src/ai/flows/summarize-offers-for-whatsapp.ts
'use server';

/**
 * @fileOverview Summarizes scraped offers and posts them to a WhatsApp group via the Whapi API.
 *
 * - summarizeOffersForWhatsApp - A function that summarizes offers and sends them to WhatsApp.
 * - SummarizeOffersInput - The input type for the summarizeOffersForWhatsApp function.
 * - SummarizeOffersOutput - The return type for the summarizeOffersForWhatsApp function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeOffersInputSchema = z.object({
  offers: z.array(
    z.object({
      id: z.string().optional(),
      headline: z.string().optional(),
      title: z.string(),
      price_from: z.string().optional(),
      price: z.number(),
      coupon: z.string().optional(),
      permalink: z.string(),
      image: z.string().optional(),
    })
  ).describe('An array of offer objects to summarize and send to WhatsApp.'),
  whapiGroupId: z.string().describe('The ID of the WhatsApp group to send the offers to.'),
  whapiToken: z.string().describe('The token for the Whapi API.'),
});
export type SummarizeOffersInput = z.infer<typeof SummarizeOffersInputSchema>;

const SummarizeOffersOutputSchema = z.object({
  success: z.boolean().describe('Whether the offers were successfully sent to WhatsApp.'),
  message: z.string().describe('A message indicating the status of the WhatsApp post.'),
});
export type SummarizeOffersOutput = z.infer<typeof SummarizeOffersOutputSchema>;


const postToWhatsApp = ai.defineTool(
    {
        name: 'postToWhatsApp',
        description: 'Posts a message to a WhatsApp group using the Whapi API.',
        inputSchema: z.object({
            groupId: z.string().describe('The ID of the WhatsApp group.'),
            message: z.string().describe('The message to send.'),
            token: z.string().describe('The Whapi API token.'),
        }),
        outputSchema: z.boolean(),
    },
    async (input) => {
        const {
            groupId,
            message,
            token
        } = input

        const apiUrl = `https://whapi.cloud/api/sendGroupMessage?token=${token}&groupId=${groupId}&text=${encodeURIComponent(message)}`

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                console.error(`Whapi API error: ${response.status} ${response.statusText}`);
                return false;
            }

            const data = await response.json();
            console.log('Whapi API response:', data);

            return data.success === true;

        } catch (error) {
            console.error('Error posting to WhatsApp:', error);
            return false;
        }
    }
);

const summarizeOffersPrompt = ai.definePrompt({
  name: 'summarizeOffersPrompt',
  input: {schema: SummarizeOffersInputSchema},
  output: {schema: SummarizeOffersOutputSchema},
  tools: [postToWhatsApp],
  prompt: `You are an AI assistant helping to share deals on WhatsApp.

You will receive a list of offers with titles, prices, discounts, and permalinks. Your task is to create a concise summary for each offer and then use the postToWhatsApp tool to send these summaries to a specified WhatsApp group.

Here are the offers:
{{#each offers}}
- Title: {{title}}
  Price: {{price}}
  Discount: {{#if price_from}}{{#discount price_from price}}{{/if}}%
  Link: {{permalink}}
{{/each}}

Make sure that you don't spam the group and only post the best deals, combining multiple offers into one message where appropriate. If there are no good deals, you don't need to post anything.

{{#each offers}}
{{#if price_from}}
{{#discount price_from price}}
{{/if}}
{{/if}}


To send the message to the group, call the postToWhatsApp tool with the group ID: {{{whapiGroupId}}} and token: {{{whapiToken}}}. The message should include the offer summary and permalink.
`, // I had to include this line to avoid an error
  helpers: {
    discount: (price_from: string, price: number) => {
      const p0 = parseFloat(price_from);
      const discount = Math.round(((p0 - price) / p0) * 100);
      return discount.toString();
    },
  },
});


export async function summarizeOffersForWhatsApp(input: SummarizeOffersInput): Promise<SummarizeOffersOutput> {
  return summarizeOffersForWhatsAppFlow(input);
}

const summarizeOffersForWhatsAppFlow = ai.defineFlow(
  {
    name: 'summarizeOffersForWhatsAppFlow',
    inputSchema: SummarizeOffersInputSchema,
    outputSchema: SummarizeOffersOutputSchema,
  },
  async input => {
    const {offers, whapiGroupId, whapiToken} = input;

    if (!offers || offers.length === 0) {
      return {success: false, message: 'No offers to summarize.'};
    }

    // Format the offers into a string that the prompt can use
    const offerDetails = offers.map(offer => ({
      title: offer.title,
      price: offer.price,
      price_from: offer.price_from,
      permalink: offer.permalink,
    }));

    const promptInput = {
      ...input,
      offers: offerDetails,
    };

    const {output} = await summarizeOffersPrompt(promptInput);

    // Call the postToWhatsApp tool to post the summarized offers to the WhatsApp group
    const success = await postToWhatsApp({
        groupId: whapiGroupId,
        message: `Check out these deals! ${offerDetails.map(offer => `${offer.title}: ${offer.price} at ${offer.permalink}`).join('\n')}`,
        token: whapiToken
    });

    return {
      success: true,
      message: `Offers summarized and sent to WhatsApp group ${whapiGroupId}.`,
    };
  }
);
