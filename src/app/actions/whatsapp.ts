
"use server";

import { controlPostFrequency } from '@/ai/flows/control-post-frequency-to-whatsapp';
import { summarizeOffersForWhatsApp } from '@/ai/flows/summarize-offers-for-whatsapp';
import type { Offer, WhapiGroup } from '@/lib/types';
import { z } from 'zod';
import { generateHeadline as localGenerateHeadline } from '@/lib/headline-generator';

const WhatsAppActionSchema = z.object({
  whapiGroupIds: z.string().min(1, 'Pelo menos um ID de grupo é obrigatório.'),
  whapiToken: z.string().min(1, 'O token é obrigatório.'),
  whapiInterval: z.number().min(0),
  whapiSendLimit: z.number().min(1),
});

export async function sendToWhatsAppAction(
  offers: Offer[],
  formData: FormData
): Promise<{ success: boolean; message: string }> {
  if (!offers || offers.length === 0) {
    return { success: false, message: 'Nenhuma oferta para enviar.' };
  }

  const whapiGroupIdsString = formData.get('whapiGroupIds') as string;

  const validatedFields = WhatsAppActionSchema.safeParse({
    whapiGroupIds: whapiGroupIdsString,
    whapiToken: formData.get('whapiToken'),
    whapiInterval: Number(formData.get('whapiInterval')),
    whapiSendLimit: Number(formData.get('whapiSendLimit')),
  });

  if (!validatedFields.success) {
    const issues = validatedFields.error.issues.map(i => i.message).join(', ');
    return { success: false, message: `Dados de configuração inválidos: ${issues}` };
  }
  
  const { whapiGroupIds: groupIdsString, whapiToken, whapiInterval, whapiSendLimit } = validatedFields.data;
  const whapiGroupIds = JSON.parse(groupIdsString);

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

    const offersToSummarize = offers.slice(0, whapiSendLimit).map(o => ({
      id: o.id,
      headline: o.headline || localGenerateHeadline(o.title, o.price_from, o.price),
      title: o.title,
      price: o.price ?? 0,
      price_from: String(o.price_from),
      coupon: o.coupon,
      permalink: o.permalink,
      image: o.image,
      advertiser_name: (o as any).advertiser_name,
    }));
    
    let allSuccess = true;
    let totalSent = 0;
    const totalGroups = whapiGroupIds.length;

    for (const groupId of whapiGroupIds) {
      const summaryResult = await summarizeOffersForWhatsApp({
        offers: offersToSummarize,
        whapiGroupId: groupId,
        whapiToken,
      });

      if (!summaryResult.success) {
        allSuccess = false;
        console.error(`Falha ao enviar para o grupo ${groupId}: ${summaryResult.message}`);
      } else {
        totalSent++;
      }
      
      // Intervalo entre grupos, se houver mais de um
      if (totalGroups > 1) {
          await new Promise(resolve => setTimeout(resolve, whapiInterval * 1000));
      }
    }
    
    if (allSuccess) {
        return { success: true, message: `Ofertas enviadas com sucesso para ${totalSent} de ${totalGroups} grupos.`};
    } else {
        return { success: false, message: `Falha no envio. ${totalSent} de ${totalGroups} grupos receberam as ofertas. Verifique os logs do servidor.`};
    }

  } catch (error) {
    console.error("Erro na ação do WhatsApp:", error);
    const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
    return { success: false, message: `Falha ao enviar para o WhatsApp: ${errorMessage}` };
  }
}

export async function getWhapiGroupsAction(token: string): Promise<{ success: boolean; message: string; data?: WhapiGroup[] }> {
    if (!token) {
        return { success: false, message: 'O token da API Whapi é obrigatório.'};
    }
    
    const apiUrl = `https://whapi.cloud/api/groups?token=${token}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Erro na API Whapi: ${response.status} ${response.statusText}`, errorBody);
            return { success: false, message: `Erro ao buscar grupos: ${response.statusText}` };
        }

        const data = await response.json();
        
        if (data.groups && Array.isArray(data.groups)) {
             const groups: WhapiGroup[] = data.groups.map((g: any) => ({ id: g.id, name: g.name }));
             return { success: true, message: 'Grupos carregados.', data: groups };
        } else {
             return { success: false, message: 'A resposta da API não continha uma lista de grupos.' };
        }

    } catch (error) {
        console.error('Erro ao buscar grupos do Whapi:', error);
        const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
        return { success: false, message: `Falha na requisição: ${errorMessage}` };
    }
}
