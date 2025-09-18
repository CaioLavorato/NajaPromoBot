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
      price_from: z.union([z.string(), z.number()]).optional(),
      price: z.number().nullable(),
      coupon: z.string().optional(),
      permalink: z.string(),
      image: z.string().optional(),
      advertiser_name: z.string().optional(), // Para Awin
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


const postMediaToWhatsApp = ai.defineTool(
    {
        name: 'postMediaToWhatsApp',
        description: 'Posta uma imagem com legenda em um grupo do WhatsApp usando a API Whapi.',
        inputSchema: z.object({
            groupId: z.string().describe('O ID do grupo do WhatsApp.'),
            imageUrl: z.string().describe('A URL da imagem a ser enviada.'),
            caption: z.string().describe('A legenda da imagem.'),
            token: z.string().describe('O token da API Whapi.'),
        }),
        outputSchema: z.boolean(),
    },
    async (input) => {
        const { groupId, imageUrl, caption, token } = input;
        const apiUrl = `https://whapi.cloud/api/v2/messages/image`;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    to: groupId,
                    media: imageUrl,
                    caption: caption,
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`Erro na API Whapi: ${response.status} ${response.statusText}`, errorBody);
                return false;
            }

            const data = await response.json();
            console.log('Resposta da API Whapi:', data);

            return data.sent === true || data.status === 'sent';

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
  tools: [postMediaToWhatsApp],
  prompt: `Você é um assistente de IA especialista em criar mensagens de ofertas para o WhatsApp.

Para CADA oferta na lista fornecida, você deve executar as seguintes tarefas:
1.  Formatar uma mensagem de legenda (caption) que seja atrativa e siga estritamente o formato do exemplo abaixo.
2.  Chamar a ferramenta 'postMediaToWhatsApp' para enviar a imagem do produto junto com a legenda formatada para o grupo de WhatsApp especificado.

Aqui estão as informações das ofertas:
{{#each offers}}
- Imagem: {{image}}
  Título: {{title}}
  Chamada: {{headline}}
  Preço Original: R$ {{#if (isNumber price_from)}}{{price_from}}{{else}}0{{/if}}
  Preço com Desconto: R$ {{#if price}}{{price}}{{else}}0{{/if}}
  Desconto: {{#discount price_from price}}{{/discount}}%
  Achado em: {{#if advertiser_name}}{{advertiser_name}}{{else}}Mercado Livre{{/if}}
  Link: {{permalink}}
{{/each}}

Use a ferramenta 'postMediaToWhatsApp' para CADA oferta.
- O 'groupId' é {{{whapiGroupId}}}.
- O 'token' é {{{whapiToken}}}.
- A 'imageUrl' é o campo 'image' da oferta.
- O 'caption' é a mensagem que você vai formatar.

---
EXEMPLO DE FORMATAÇÃO DA LEGENDA (CAPTION):
{{headline}}

{{title}}

De: R$ {{formatCurrency price_from}} | Por: R$ {{formatCurrency price}} 🔥 ({{#discount price_from price}}{{/discount}}% ⬇️)

Achado na {{#if advertiser_name}}{{advertiser_name}}{{else}}Mercado Livre{{/if}} ⚡️
{{permalink}}
---

Certifique-se de calcular o desconto e formatar os preços corretamente. Chame a ferramenta para cada oferta individualmente. Se não houver ofertas, retorne uma mensagem de sucesso indicando que nada foi feito.
`,
  helpers: {
    discount: (price_from: string | number, price: number | null) => {
      if (!price_from || !price) return 0;
      const p0 = parseFloat(String(price_from));
      const p1 = parseFloat(String(price));
      if (isNaN(p0) || isNaN(p1) || p0 <= p1) {
        return 0;
      }
      return Math.round(((p0 - p1) / p0) * 100);
    },
    formatCurrency: (value: string | number | null | undefined) => {
        if (value === null || typeof value === 'undefined') return '0,00';
        const num = parseFloat(String(value));
        if (isNaN(num)) return '0,00';
        return num.toFixed(2).replace('.', ',');
    },
    isNumber: (value: any) => typeof value === 'number'
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
    if (input.offers.length === 0) {
      return { success: true, message: 'Nenhuma oferta para enviar.' };
    }

    const { toolRequests } = await summarizeOffersPrompt(input);
    
    let sentCount = 0;
    for (const toolRequest of toolRequests) {
        if (toolRequest.tool.name === 'postMediaToWhatsApp') {
            const result = await toolRequest.run();
            if (result) {
                sentCount++;
            }
            // Intervalo entre as mensagens
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    
    if (sentCount > 0) {
      return { success: true, message: `${sentCount} de ${input.offers.length} ofertas enviadas com sucesso para o WhatsApp.` };
    } else {
      return { success: false, message: 'Nenhuma oferta pôde ser enviada para o WhatsApp.' };
    }
  }
);
