
"use server";

import { z } from "zod";
import type { AppSettings, AwinProduct, AwinOffer } from "@/lib/types";
import Papa from "papaparse";
import { Readable } from "stream";
import { createGunzip } from "zlib";
import { Offer } from "@/lib/types";
import { sendToWhatsAppAction } from "./whatsapp";

const ProcessFeedSchema = z.object({
  minDiscount: z.number().min(0).max(100).optional(),
});

function calculateDiscount(storePriceStr: string, productPriceStr: string): number {
    const storePrice = parseFloat(storePriceStr);
    const productPrice = parseFloat(productPriceStr);
    if (isNaN(storePrice) || isNaN(productPrice) || storePrice <= productPrice) {
        return 0;
    }
    return Math.round(((storePrice - productPrice) / storePrice) * 100);
}

export async function processAwinFeedAction(
  appSettings: AppSettings,
  prevState: any,
  formData: FormData
): Promise<{ data: AwinOffer[] | null; error?: string; message?: string }> {
  const validatedFields = ProcessFeedSchema.safeParse({
    minDiscount: Number(formData.get("minDiscount")) || undefined,
  });

  if (!validatedFields.success) {
    return { data: null, error: "Dados de formulário inválidos." };
  }

  const { minDiscount } = validatedFields.data;
  const { awinApiKey, awinAdvertiserIds } = appSettings;

  if (!awinApiKey || !awinAdvertiserIds) {
    return { data: null, error: "A API Key e os Advertiser IDs da Awin devem ser configurados." };
  }
    
  const columns = "aw_deep_link,product_name,aw_product_id,advertiser_name,store_price,product_price,image_url";
  const url = `https://productdata.awin.com/datafeed/download/apikey/${awinApiKey}/language/pt-br/cid/${awinAdvertiserIds}/fid/32945,32947/columns/${columns}/format/csv/delimiter/%2C/compression/gzip/`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Falha ao baixar o feed da Awin: ${response.status} ${response.statusText}`);
    }
    
    // Decompress a stream
    const readableStream = Readable.fromWeb(response.body as any);
    const gunzip = createGunzip();
    const decompressedStream = readableStream.pipe(gunzip);
    const text = await new Promise<string>((resolve, reject) => {
        let text = '';
        decompressedStream.on('data', chunk => text += chunk.toString());
        decompressedStream.on('end', () => resolve(text));
        decompressedStream.on('error', reject);
    });

    const { data: products } = Papa.parse<AwinProduct>(text, {
      header: true,
      skipEmptyLines: true,
    });

    let offers: AwinOffer[] = products.map((p) => ({
      id: p.aw_product_id,
      headline: "", 
      title: p.product_name,
      price: parseFloat(p.product_price) || null,
      price_from: parseFloat(p.store_price) || "",
      coupon: "", 
      permalink: p.aw_deep_link,
      image: p.image_url,
      discount_pct: calculateDiscount(p.store_price, p.product_price),
      advertiser_name: p.advertiser_name,
    }));
    
    if (minDiscount && minDiscount > 0) {
      offers = offers.filter((o) => (o.discount_pct || 0) >= minDiscount);
    }
    
    offers.sort((a, b) => (b.discount_pct || 0) - (a.discount_pct || 0));

    if (offers.length === 0) {
        return { data: [], message: "Nenhum produto encontrado com os critérios de filtro." };
    }

    return { data: offers, message: `${offers.length} ofertas processadas com sucesso.` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
    console.error("Erro no processamento do feed Awin:", message);
    return { data: null, error: message };
  }
}


export async function sendAwinToWhatsAppAction(
  offers: AwinOffer[],
  appSettings: AppSettings
): Promise<{ success: boolean; message: string }> {
  
  if (!offers || offers.length === 0) {
    return { success: false, message: "Nenhuma oferta para enviar." };
  }
  
  const offersToSend: Offer[] = offers.map(o => ({
      ...o,
      title: `[${o.advertiser_name}] ${o.title}`, // Add advertiser name to title
  }));

  const formData = new FormData();
  formData.append('whapiToken', appSettings.whapiToken);
  formData.append('whapiGroupIds', JSON.stringify(appSettings.whapiSelectedGroups.map(g => g.id)));

  return await sendToWhatsAppAction(offersToSend, formData);
}
