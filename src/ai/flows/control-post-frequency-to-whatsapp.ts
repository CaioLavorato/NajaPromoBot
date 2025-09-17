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
  timeOfDay: z.string().describe('A hora atual do dia (ex: manhã, tarde, noite).'),
  offerAttractiveness: z
    .string()
    .describe("Uma descrição do quão atrativa é a oferta (ex: 'muito atrativa', 'moderadamente atrativa', 'pouco atrativa')."),
  lastPostTime: z
    .string()
    .optional()
    .describe('A hora da última postagem no grupo do WhatsApp, se houver.'),
});
export type ControlPostFrequencyInput = z.infer<typeof ControlPostFrequencyInputSchema>;

const ControlPostFrequencyOutputSchema = z.object({
  shouldPost: z.boolean().describe('Se uma postagem deve ou não ser feita no grupo do WhatsApp.'),
  reason: z
    .string()
    .describe('A razão para a decisão (ex: o horário do dia é ideal, a oferta é muito atrativa, a última postagem foi muito recente).'),
});
export type ControlPostFrequencyOutput = z.infer<typeof ControlPostFrequencyOutputSchema>;

export async function controlPostFrequency(input: ControlPostFrequencyInput): Promise<ControlPostFrequencyOutput> {
  return controlPostFrequencyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'controlPostFrequencyPrompt',
  input: {schema: ControlPostFrequencyInputSchema},
  output: {schema: ControlPostFrequencyOutputSchema},
  prompt: `Você é um especialista em gerenciar engajamento em redes sociais, especialmente para ofertas promocionais.

Com base na hora atual do dia, na atratividade da oferta e na hora da última postagem, decida se uma postagem deve ou não ser feita em um grupo de WhatsApp. Seu objetivo é maximizar o engajamento enquanto evita spammar o grupo.

Considere estes fatores:

- Hora do Dia: Algumas horas do dia são melhores para engajamento do que outras. Por exemplo, noites e horários de almoço podem ser ideais.
- Atratividade da Oferta: Ofertas altamente atrativas podem justificar postagens mais frequentes.
- Hora da Última Postagem: Evite postar com muita frequência. Um intervalo razoável entre as postagens é importante.

Aqui estão as informações:

Hora do Dia: {{{timeOfDay}}}
Atratividade da Oferta: {{{offerAttractiveness}}}
Hora da Última Postagem: {{{lastPostTime}}}

Com base nisso, uma postagem deve ser feita? Explique seu raciocínio.

Produza APENAS um objeto JSON que esteja em conformidade com o esquema. Não forneça nenhum texto ao redor.`,
});

const controlPostFrequencyFlow = ai.defineFlow(
  {
    name: 'controlPostFrequencyFlow',
    inputSchema: ControlPostFrequencyInputSchema,
    outputSchema: ControlPostFrequencyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("O modelo de IA não retornou uma resposta.");
    }
    return output;
  }
);
