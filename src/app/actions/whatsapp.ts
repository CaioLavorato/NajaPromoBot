"use server";

import { controlPostFrequency } from '@/ai/flows/control-post-frequency-to-whatsapp';
import { summarizeOffersForWhatsApp } from '@/ai/flows/summarize-offers-for-whatsapp';
import type { Offer } from '@/lib/types';
import { z } from 'zod';

const WhatsAppActionSchema = z.object({
  whapiGroupId: z.string().min(1, 'Group ID is required.'),
  whapiToken: z.string().min(1, 'Token is required.'),
});

export async function sendToWhatsAppAction(
  offers: Offer[],
  formData: FormData
): Promise<{ success: boolean; message: string }> {
  if (!offers || offers.length === 0) {
    return { success: false, message: 'No offers to send.' };
  }

  const validatedFields = WhatsAppActionSchema.safeParse({
    whapiGroupId: formData.get('whapiGroupId'),
    whapiToken: formData.get('whapiToken'),
  });

  if (!validatedFields.success) {
    return { success: false, message: "WhatsApp Group ID and Token are required." };
  }
  
  const { whapiGroupId, whapiToken } = validatedFields.data;

  const now = new Date();
  const timeOfDay = now.getHours() < 12 ? 'morning' : now.getHours() < 18 ? 'afternoon' : 'evening';
  const averageDiscount = offers.reduce((acc, o) => acc + (o.discount_pct || 0), 0) / offers.length;
  
  const postControlInput = {
    timeOfDay,
    offerAttractiveness: `Average discount is ${averageDiscount.toFixed(0)}%`,
  };
  
  try {
    const controlResult = await controlPostFrequency(postControlInput);

    if (!controlResult.shouldPost) {
      return { success: false, message: `Skipping post: ${controlResult.reason}` };
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
    console.error("WhatsApp Action Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Failed to send to WhatsApp: ${errorMessage}` };
  }
}
