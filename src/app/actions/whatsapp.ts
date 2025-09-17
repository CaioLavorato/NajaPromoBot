"use server";

import { controlPostFrequency } from '@/ai/flows/control-post-frequency-to-whatsapp';
import { summarizeOffersForWhatsApp } from '@/ai/flows/summarize-offers-for-whatsapp';
import type { Offer } from '@/lib/types';
import { z } from 'zod';

const WhatsAppActionSchema = z.object({
  whapiGroupId: z.string().min(1, 'O ID do grupo é obrigatório.'),
  whapiToken: z.string().min(1, 'O token é obrigatório.'),
});

export async function sendToWhatsAppAction(
  offers: Offer[],
  formData: FormData
): Promise<{ success: boolean; message: string }> {
  if (!offers || offers.length === 0) {
    return { success: false, message: 'Nenhuma oferta para enviar.' };
  }

  const validatedFields = WhatsAppActionSchema.safeParse({
    whapiGroupId: formData.get('whapiGroupId'),
    whapiToken: formData.get('whapiToken'),
  });

  if (!validatedFields.success) {
    return { success: false, message: "O ID do grupo e o Token do WhatsApp são obrigatórios." };
  }
  
  const { whapiGroupId, whapiToken } = validatedFields.data;

  const now = new Date();
  const timeOfDay = now.getHours() < 12 ? 'manhã' : now.getHours() < 18 ? 'tarde' : 'noite';
  const averageDiscount = offers.reduce((acc, o) => acc + (o.discount_pct || 0), 0) / offers.length;
  
  const postControlInput = {
    timeOfDay,
    offerAttractiveness: `Desconto médio é de ${averageDiscount.toFixed(0)}%`,
  };
  
  try {
    const controlResult = await controlPostFrequency(postControlInput);

    if (!controlResult.shouldPost) {
      return { success: false, message: `Postagem ignorada: ${controlResult.reason}` };
    }

    const offersToSummarize = offers.map(o => ({
      id: o.id,
      headline: o.headline,
      title: o.title,
      price: o.price ?? 0,
      price_from: String(o.price_from),
      coupon: o.coupon,
      permalink: o.permalink,
      image: o.image
    }));

    const summaryResult = await summarizeOffersForWhatsApp({
      offers: offersToSummarize,
      whapiGroupId,
      whapiToken,
    });

    return summaryResult;
  } catch (error) {
    console.error("Erro na ação do WhatsApp:", error);
    const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
    return { success: false, message: `Falha ao enviar para o WhatsApp: ${errorMessage}` };
  }
}