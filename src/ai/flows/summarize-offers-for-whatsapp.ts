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
  ).describe('Um array de objetos de oferta para resumir e enviar para o WhatsApp.'),
  whapiGroupId: z.string().describe('O ID do grupo do WhatsApp para enviar as ofertas.'),
  whapiToken: z.string().describe('O token para a API Whapi.'),
});
export type SummarizeOffersInput = z.infer<typeof SummarizeOffersInputSchema>;

const SummarizeOffersOutputSchema = z.object({
  success: z.boolean().describe('Se as ofertas foram enviadas com sucesso para o WhatsApp.'),
  message: z.string().describe('Uma mensagem indicando o status da postagem no WhatsApp.'),
});
export type SummarizeOffersOutput = z.infer<typeof SummarizeOffersOutputSchema>;


const postToWhatsApp = ai.defineTool(
    {
        name: 'postToWhatsApp',
        description: 'Posta uma mensagem em um grupo do WhatsApp usando a API Whapi.',
        inputSchema: z.object({
            groupId: z.string().describe('O ID do grupo do WhatsApp.'),
            message: z.string().describe('A mensagem a ser enviada.'),
            token: z.string().describe('O token da API Whapi.'),
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
                console.error(`Erro na API Whapi: ${response.status} ${response.statusText}`);
                return false;
            }

            const data = await response.json();
            console.log('Resposta da API Whapi:', data);

            return data.success === true;

        } catch (error) {
            console.error('Erro ao postar no WhatsApp:', error);
            return false;
        }
    }
);

const summarizeOffersPrompt = ai.definePrompt({
  name: 'summarizeOffersPrompt',
  input: {schema: SummarizeOffersInputSchema},
  output: {schema: SummarizeOffersOutputSchema},
  tools: [postToWhatsApp],
  prompt: `Você é um assistente de IA ajudando a compartilhar ofertas no WhatsApp.

Você receberá uma lista de ofertas com títulos, preços, descontos e permalinks. Sua tarefa é criar um resumo conciso para cada oferta e, em seguida, usar a ferramenta postToWhatsApp para enviar esses resumos a um grupo de WhatsApp especificado.

Aqui estão as ofertas:
{{#each offers}}
- Título: {{title}}
  Preço: {{price}}
  Desconto: {{#if price_from}}{{#discount price_from price}}{{/if}}%
  Link: {{permalink}}
{{/each}}

Certifique-se de não enviar spam para o grupo e poste apenas as melhores ofertas, combinando várias ofertas em uma única mensagem, quando apropriado. Se não houver boas ofertas, você não precisa postar nada.

{{#each offers}}
{{#if price_from}}
{{#discount price_from price}}
{{/if}}
{{/if}}


Para enviar a mensagem para o grupo, chame a ferramenta postToWhatsApp com o ID do grupo: {{{whapiGroupId}}} e o token: {{{whapiToken}}}. A mensagem deve incluir o resumo da oferta e o permalink.
`, 
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
    const {output} = await summarizeOffersPrompt(input);
    if (!output) {
      return { success: false, message: 'O modelo de IA não retornou uma resposta.' };
    }
    return output;
  }
);
