'use server';
/**
 * @fileOverview Controls the frequency of posts to a WhatsApp group to avoid spamming.
 *
 * - controlPostFrequency - A function that determines whether to post an offer based on factors like time of day and offer attractiveness.
 * - ControlPostFrequencyInput - The input type for the controlPostFrequency function.
 * - ControlPostFrequencyOutput - The return type for the controlPostFrequency function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ControlPostFrequencyInputSchema = z.object({
  timeOfDay: z.string().describe('The current time of day (e.g., morning, afternoon, evening).'),
  offerAttractiveness: z
    .string()
    .describe("A description of how attractive the offer is (e.g., 'very attractive', 'moderately attractive', 'not very attractive')."),
  lastPostTime: z
    .string()
    .optional()
    .describe('The time of the last post to the WhatsApp group, if any.'),
});
export type ControlPostFrequencyInput = z.infer<typeof ControlPostFrequencyInputSchema>;

const ControlPostFrequencyOutputSchema = z.object({
  shouldPost: z.boolean().describe('Whether or not a post should be made to the WhatsApp group.'),
  reason: z
    .string()
    .describe('The reason for the decision (e.g., time of day is optimal, offer is very attractive, last post was too recent).'),
});
export type ControlPostFrequencyOutput = z.infer<typeof ControlPostFrequencyOutputSchema>;

export async function controlPostFrequency(input: ControlPostFrequencyInput): Promise<ControlPostFrequencyOutput> {
  return controlPostFrequencyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'controlPostFrequencyPrompt',
  input: {schema: ControlPostFrequencyInputSchema},
  output: {schema: ControlPostFrequencyOutputSchema},
  prompt: `You are an expert in managing social media engagement, especially for promotional offers.

Based on the current time of day, the attractiveness of the offer, and the time of the last post, decide whether or not a post should be made to a WhatsApp group. Your goal is to maximize engagement while avoiding spamming the group.

Consider these factors:

- Time of Day: Some times of day are better for engagement than others. For example, evenings and lunch breaks might be optimal.
- Offer Attractiveness: Highly attractive offers might warrant more frequent posts.
- Last Post Time: Avoid posting too frequently. A reasonable interval between posts is important.

Here is the information:

Time of Day: {{{timeOfDay}}}
Offer Attractiveness: {{{offerAttractiveness}}}
Last Post Time: {{{lastPostTime}}}

Based on this, should a post be made? Explain your reasoning.

Output ONLY a JSON object that conforms to the schema. Do not provide any surrounding text.`,
});

const controlPostFrequencyFlow = ai.defineFlow(
  {
    name: 'controlPostFrequencyFlow',
    inputSchema: ControlPostFrequencyInputSchema,
    outputSchema: ControlPostFrequencyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
