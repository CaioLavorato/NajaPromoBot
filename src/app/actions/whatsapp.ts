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

  // aceita JSON ["id1","id2"] ou "id1,id2"
  let whapiGroupIds: string[] = [];
  try {
    const parsed = JSON.parse(groupIdsString);
    whapiGroupIds = Array.isArray(parsed) ? parsed : [];
  } catch {
    whapiGroupIds = groupIdsString.split(',').map(s => s.trim()).filter(Boolean);
  }
  if (!whapiGroupIds.length) {
    return { success: false, message: 'Nenhum ID de grupo válido informado.' };
  }

  // -------- NOVO: dados opcionais p/ controle de frequência --------
  const now = new Date();
  const timeOfDay = now.getHours() < 12 ? 'manhã' : now.getHours() < 18 ? 'tarde' : 'noite';
  const averageDiscount =
    offers.reduce((acc, o) => acc + (o.discount_pct || 0), 0) / Math.max(offers.length, 1);

  const providedLastPostedAt = (formData.get('whapiLastPostedAt') as string) || '';
  // se não informado, usa 6h atrás para não bloquear por “ausente”
  const lastPostedAt =
    providedLastPostedAt ||
    new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  const minCooldownMinutes = Number(formData.get('whapiMinCooldown') ?? 30);
  const forceSend = String(formData.get('whapiForce') ?? '').toLowerCase() === 'true';

  const postControlInput = {
    timeOfDay, // já existia
    offerAttractiveness: `Desconto médio é de ${isFinite(averageDiscount) ? averageDiscount.toFixed(0) : '0'}%`,
    // novos campos (o teu flow pode simplesmente ignorar se não usar)
    lastPostedAt,           // ISO string
    minCooldownMinutes,     // ex.: 30
    offersCount: offers.length,
    groupsCount: whapiGroupIds.length,
  };
  // -----------------------------------------------------------------

  try {
    const controlResult = await controlPostFrequency(postControlInput);

    if (!controlResult.shouldPost && !forceSend) {
      // Se bloquear por falta de "última postagem", já estamos mandando um valor default.
      // Ainda assim, respeita bloqueios explícitos, a menos que forceSend esteja true.
      return { success: false, message: `Postagem ignorada: ${controlResult.reason}` };
    }

    const offersToSummarize = offers.slice(0, whapiSendLimit).map(o => ({
      id: o.id,
      headline: o.headline || localGenerateHeadline(o.title, o.price_from, o.price),
      title: o.title,
      price: o.price ?? 0,
      price_from: String(o.price_from ?? ''),
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

      if (totalGroups > 1 && whapiInterval > 0) {
        await new Promise(r => setTimeout(r, whapiInterval * 1000));
      }
    }

    if (allSuccess) {
      // dica: no front você pode salvar "agora" como última postagem
      return { success: true, message: `Ofertas enviadas com sucesso para ${totalSent} de ${totalGroups} grupos.` };
    } else {
      return { success: false, message: `Falha no envio. ${totalSent} de ${totalGroups} grupos receberam as ofertas.` };
    }
  } catch (error) {
    console.error('Erro na ação do WhatsApp:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
    return { success: false, message: `Falha ao enviar para o WhatsApp: ${errorMessage}` };
  }
}


export async function getWhapiGroupsAction(
  token: string
): Promise<{ success: boolean; message: string; data?: WhapiGroup[] }> {
  if (!token) {
    return { success: false, message: 'O token da API Whapi é obrigatório.' };
  }

  // Host/rota corretos + token via Authorization header
  const apiUrl = 'https://gate.whapi.cloud/groups';

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      const body = await response.text();
      return {
        success: false,
        message: `Erro ao buscar grupos: HTTP ${response.status} ${response.statusText} – ${body.slice(0, 180)}`,
      };
    }

    if (!contentType.includes('application/json')) {
      const body = await response.text();
      return {
        success: false,
        message: `Resposta não-JSON da API (content-type: ${contentType}). Trecho: ${body.slice(0, 180)}`,
      };
    }

    const data = await response.json();

    // Suporta formatos comuns: array direto ou objeto com "groups"/"chats"
    const rawGroups = (Array.isArray(data) ? data : (data.groups || data.chats || [])) as any[];

    const groups: WhapiGroup[] = rawGroups
      .map((g: any) => ({
        id: g.id || g.chatId || g.chat_id,               // ex: "1203...@g.us"
        name: g.name || g.subject || g.title || '',      // nome/título do grupo
      }))
      .filter(g => g.id && g.name);

    if (!groups.length) {
      return { success: false, message: 'A resposta da API não continha uma lista de grupos.' };
    }

    return { success: true, message: 'Grupos carregados.', data: groups };
  } catch (error) {
    console.error('Erro ao buscar grupos do Whapi:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
    return { success: false, message: `Falha na requisição: ${errorMessage}` };
  }
}
