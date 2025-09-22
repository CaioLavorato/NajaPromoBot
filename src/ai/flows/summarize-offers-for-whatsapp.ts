// src/ai/flows/summarize-offers-for-whatsapp.ts
'use server';

/**
 * Summarizes scraped offers and posts them to a WhatsApp group via the Whapi API.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

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
      advertiser_name: z.string().optional(),
      // derivados/preparados (preenchidos no flow)
      price_from_fmt: z.string().optional(),
      price_fmt: z.string().optional(),
      has_price_from: z.boolean().optional(),
      has_price: z.boolean().optional(),
      discount_pct: z.number().optional(),
      discount_label: z.string().optional(),
    })
  ),
  whapiGroupId: z.string(),
  whapiToken: z.string(),
});
export type SummarizeOffersInput = z.infer<typeof SummarizeOffersInputSchema>;

const SummarizeOffersOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type SummarizeOffersOutput = z.infer<typeof SummarizeOffersOutputSchema>;

/** ------------------------------------------------------------------ */
/** Tool: envia imagem + legenda para um grupo usando Whapi (GATE host) */
/** ------------------------------------------------------------------ */
const postMediaToWhatsApp = ai.defineTool(
  {
    name: 'postMediaToWhatsApp',
    description: 'Posta uma imagem com legenda em um grupo do WhatsApp usando a API Whapi.',
    inputSchema: z.object({
      groupId: z.string(),
      imageUrl: z.string().optional(),   // opcional — não envie null
      caption: z.string(),
      token: z.string(),
    }),
    outputSchema: z.boolean(),
  },
  async (input) => {
    const { groupId, imageUrl, caption, token } = input;

    async function sendImage(urlAs: 'string' | 'object'): Promise<{ ok: boolean; body?: string }> {
      const apiUrl = `https://gate.whapi.cloud/messages/image`;
      const mediaPayload = urlAs === 'string' ? imageUrl : (imageUrl ? { link: imageUrl } : undefined);

      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: groupId,
          ...(imageUrl ? { media: mediaPayload } : {}),
          caption,
        }),
      });

      const body = await resp.text();
      const ct = resp.headers.get('content-type') || '';

      if (!resp.ok) return { ok: false, body };
      if (ct.includes('application/json')) {
        try {
          const data = JSON.parse(body);
          const sent =
            data?.sent === true ||
            data?.status === 'sent' ||
            data?.success === true ||
            data?.message_id != null;
          return { ok: !!sent, body };
        } catch {
          // 200 mas sem JSON – geralmente OK
          return { ok: true, body };
        }
      }
      // 200 sem JSON – considerar OK
      return { ok: true, body };
    }

    async function sendText(): Promise<{ ok: boolean; body?: string }> {
      const apiUrl = `https://gate.whapi.cloud/messages/text`;
      const resp = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: groupId,
          body: caption,
        }),
      });
      const body = await resp.text();
      if (!resp.ok) return { ok: false, body };
      return { ok: true, body };
    }

    try {
      // Se não tem imagem, manda texto direto
      if (!imageUrl) {
        const t = await sendText();
        if (!t.ok) console.error('Whapi TEXT fail:', t.body?.slice(0, 400));
        return t.ok;
      }

      // Tenta imagem com media:string
      const r1 = await sendImage('string');
      if (r1.ok) return true;

      // Se falhou, tenta formato {link: ...}
      const r2 = await sendImage('object');
      if (r2.ok) return true;

      // Fallback final: texto
      const t = await sendText();
      if (!t.ok) {
        console.error('Whapi IMAGE fail #1:', r1.body?.slice(0, 400));
        console.error('Whapi IMAGE fail #2:', r2.body?.slice(0, 400));
        console.error('Whapi TEXT fail:', t.body?.slice(0, 400));
      }
      return t.ok;
    } catch (err) {
      console.error('postMediaToWhatsApp exception:', err);
      return false;
    }
  }
);

/** ---------------------------------------------- */
/** Prompt (sem helpers): com preço original riscado (~) */
/** ---------------------------------------------- */
const summarizeOffersPrompt = ai.definePrompt({
  name: 'summarizeOffersPrompt',
  input: { schema: SummarizeOffersInputSchema },
  output: { schema: z.any() },
  tools: [postMediaToWhatsApp],
  prompt: `Você é um assistente de IA que vai ENVIAR CADA OFERTA separadamente no formato exato abaixo, respeitando quebras de linha e negritos do WhatsApp (asteriscos) e usando riscado com "~" no preço original.

Para cada item em "offers":
- Monte a legenda exatamente neste formato:

*{{headline}}*

{{title}}

{{#if has_price_from}}De: ~R$ {{price_from_fmt}}~ | {{/if}}Por: *R$ {{price_fmt}}* 🔥{{#if has_price_from}} ({{discount_label}} ⬇️){{/if}}

Achado na *{{#if advertiser_name}}{{advertiser_name}}{{else}}Mercado Livre{{/if}}* ⚡

{{permalink}}

- Em seguida, chame a ferramenta postMediaToWhatsApp com:
  - groupId = {{{whapiGroupId}}}
  - token   = {{{whapiToken}}}
  - imageUrl = o campo "image" (se ausente, ainda envie a legenda)
  - caption  = a legenda acima
`,
});

/** Utils para preparar números/formatos com robustez */
function toNumber(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  // aceita "1.234,56" e "1234.56"
  const s = String(v).trim().replace(/\s+/g, '');
  const normalized =
    /,\d{2}$/.test(s) // termina com ",dd" -> formato BR
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(/[^0-9.-]/g, '');
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}
function fmtBRL(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return '0,00';
  const rounded = Math.round(n * 100) / 100;
  return rounded.toFixed(2).replace('.', ',');
}
function calcDiscount(p0: number | null, p1: number | null): number {
  if (!p0 || !p1 || p0 <= 0 || p1 <= 0 || p0 <= p1) return 0;
  return Math.round(((p0 - p1) / p0) * 100);
}
function validImageUrl(u?: string | null): string | undefined {
  if (!u) return undefined;
  const s = String(u).trim();
  if (!/^https?:\/\//i.test(s)) return undefined; // exige http/https público
  return s;
}

export async function summarizeOffersForWhatsApp(input: SummarizeOffersInput): Promise<SummarizeOffersOutput> {
  return summarizeOffersForWhatsAppFlow(input);
}

const summarizeOffersForWhatsAppFlow = ai.defineFlow(
  {
    name: 'summarizeOffersForWhatsAppFlow',
    inputSchema: SummarizeOffersInputSchema,
    outputSchema: SummarizeOffersOutputSchema,
  },
  async (input, streamingCallback) => {
    if (input.offers.length === 0) {
      return { success: true, message: 'Nenhuma oferta para enviar.' };
    }

    // PREPARO: evita NaN e decide quando mostrar "De: ... |"
    const preparedOffers = input.offers.map((o) => {
      const p0 = toNumber(o.price_from ?? null);
      const p1 = toNumber(o.price ?? null);

      const has_price_from = p0 !== null && p0 > 0;
      const has_price = p1 !== null && p1 > 0;

      const price_from_fmt = has_price_from ? fmtBRL(p0) : '0,00';
      const price_fmt = has_price ? fmtBRL(p1) : '0,00';

      const discount_pct = has_price_from && has_price ? calcDiscount(p0, p1) : 0;
      const discount_label = discount_pct > 0 ? `${discount_pct}%` : '-';

      return {
        ...o,
        headline: o.headline?.trim() || 'OFERTA 🔥',
        has_price_from,
        has_price,
        price_from_fmt,
        price_fmt,
        discount_pct,
        discount_label,
      };
    });

    const resp = await summarizeOffersPrompt({
      ...input,
      offers: preparedOffers,
    });

    const toolRequests: Array<{ toolRequest: { name: string; input?: any } }> =
      Array.isArray((resp as any)?.toolRequests) ? (resp as any).toolRequests : [];

    let sentCount = 0;

    if (toolRequests.length > 0) {
      // Caminho normal: executar toolRequests gerados pelo LLM
      for (let i = 0; i < toolRequests.length; i++) {
        const tr = toolRequests[i];

        if (streamingCallback) {
          streamingCallback({
            index: i + 1,
            total: toolRequests.length,
            message: `Enviando oferta ${i + 1} de ${toolRequests.length}...`,
          });
        }

        if (tr?.toolRequest?.name === 'postMediaToWhatsApp') {
          const inp = (tr.toolRequest.input || {}) as any;
          // sanitize imageUrl (não envie null/''/inválido)
          if (!validImageUrl(inp.imageUrl)) {
            if ('imageUrl' in inp) delete inp.imageUrl;
          }
          const ok = await (postMediaToWhatsApp as any)(inp);
          if (ok) sentCount++;
          else console.error('postMediaToWhatsApp returned false for:', inp);
        }

        if (i < toolRequests.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }
    } else {
      // Fallback: sem toolRequests – envio direto
      for (let i = 0; i < preparedOffers.length; i++) {
        const o = preparedOffers[i];

        const caption =
          `*${o.headline}*\n\n` +
          `${o.title}\n\n` +
          `${o.has_price_from ? `De: ~R$ ${o.price_from_fmt}~ | ` : ''}Por: *R$ ${o.price_fmt}* 🔥` +
          `${o.has_price_from ? ` (${o.discount_label} ⬇️)` : ''}\n\n` +
          `Achado na *${o.advertiser_name ?? 'Mercado Livre'}* ⚡\n\n` +
          `${o.permalink}`;

        if (streamingCallback) {
          streamingCallback({
            index: i + 1,
            total: preparedOffers.length,
            message: `Enviando oferta ${i + 1} de ${preparedOffers.length}...`,
          });
        }

        const toolInput: any = {
          groupId: input.whapiGroupId,
          caption,
          token: input.whapiToken,
        };
        const img = validImageUrl(o.image);
        if (img) toolInput.imageUrl = img;

        const ok = await (postMediaToWhatsApp as any)(toolInput);

        if (ok) sentCount++;
        else console.error('Fallback direct send returned false for:', { groupId: input.whapiGroupId, image: o.image, used: img });

        if (i < preparedOffers.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }
    }

    if (sentCount > 0) {
      return {
        success: true,
        message: `${sentCount} de ${input.offers.length} ofertas enviadas com sucesso para o WhatsApp.`,
      };
    } else {
      return {
        success: false,
        message: 'Nenhuma oferta pôde ser enviada para o WhatsApp. Verifique os logs do servidor (Whapi).',
      };
    }
  }
);
