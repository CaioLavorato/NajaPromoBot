
"use server";

import { z } from 'zod';
import type { AppSettings, AmazonProduct } from '@/lib/types';
import crypto from 'crypto';

const SearchSchema = z.object({
  keywords: z.string().optional(),
  browseNodeId: z.string().optional(),
}).refine(data => !!data.keywords || !!data.browseNodeId, {
    message: "Forneça uma palavra-chave ou selecione uma categoria para buscar.",
});


// Helper function to create the AWS signature
async function createSignature(
  host: string,
  path: string,
  payload: string,
  service: string,
  region: string,
  accessKey: string,
  secretKey: string,
  timestamp: string
): Promise<string> {
  const date = timestamp.substring(0, 8);

  const getSignatureKey = async (key: string, dateStamp: string, regionName: string, serviceName: string) => {
    const kDate = await crypto.subtle.importKey('raw', new TextEncoder().encode('AWS4' + key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const kDate_signed = await crypto.subtle.sign('HMAC', kDate, new TextEncoder().encode(dateStamp));
    const kRegion = await crypto.subtle.importKey('raw', kDate_signed, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const kRegion_signed = await crypto.subtle.sign('HMAC', kRegion, new TextEncoder().encode(regionName));
    const kService = await crypto.subtle.importKey('raw', kRegion_signed, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const kService_signed = await crypto.subtle.sign('HMAC', kService, new TextEncoder().encode(serviceName));
    const kSigning = await crypto.subtle.importKey('raw', kService_signed, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return kSigning;
  };

  const canonicalRequest = [
    'POST',
    path,
    '',
    `host:${host}`,
    'x-amz-date:' + timestamp,
    'x-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems',
    '',
    'host;x-amz-date;x-amz-target',
    crypto.createHash('sha256').update(payload).digest('hex'),
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    timestamp,
    `${date}/${region}/${service}/aws4_request`,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n');

  const signingKey = await getSignatureKey(secretKey, date, region, service);
  const signature = await crypto.subtle.sign('HMAC', signingKey, new TextEncoder().encode(stringToSign));

  return Buffer.from(signature).toString('hex');
}


export async function searchAmazonAction(
  appSettings: AppSettings,
  prevState: any,
  formData: FormData
): Promise<{ data: AmazonProduct[] | null; error?: string }> {
  const validatedFields = SearchSchema.safeParse({
    keywords: formData.get('keywords'),
    browseNodeId: formData.get('browseNodeId'),
  });

  if (!validatedFields.success) {
    return { data: null, error: validatedFields.error.flatten().fieldErrors._form?.[0] };
  }

  const { keywords, browseNodeId } = validatedFields.data;
  const { amazonPartnerTag, amazonAccessKey, amazonSecretKey } = appSettings;

  if (!amazonPartnerTag || !amazonAccessKey || !amazonSecretKey) {
    return { data: null, error: "As credenciais da API da Amazon não estão configuradas." };
  }

  const service = 'ProductAdvertisingAPI';
  const region = 'us-east-1';
  const host = 'paapi5.amazon.com.br';
  const path = '/paapi5/searchitems';
  const marketplace = 'www.amazon.com.br';

  const payload: any = {
    PartnerTag: amazonPartnerTag,
    PartnerType: 'Associates',
    ItemCount: 10,
    Resources: [
        'ItemInfo.Title',
        'Offers.Listings.Price',
        'Images.Primary.Large',
        'Offers.Listings.Saving',
    ],
    Marketplace: marketplace,
  };

  if (keywords) {
    payload.Keywords = keywords;
  }
  if (browseNodeId) {
    payload.BrowseNodeId = browseNodeId;
  }

  const payloadString = JSON.stringify(payload);
  
  const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  
  try {
    const signature = await createSignature(host, path, payloadString, service, region, amazonAccessKey, amazonSecretKey, timestamp);
    
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Amz-Date': timestamp,
      'X-Amz-Target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems',
      'Authorization': `AWS4-HMAC-SHA256 Credential=${amazonAccessKey}/${timestamp.substring(0, 8)}/${region}/${service}/aws4_request, SignedHeaders=host;x-amz-date;x-amz-target, Signature=${signature}`,
      'Content-Encoding': 'amz-1.0',
    };

    const response = await fetch(`https://${host}${path}`, {
      method: 'POST',
      headers: headers,
      body: payloadString,
    });
    
    const responseData = await response.json();

    if (responseData.Errors) {
      console.error("Erro da API da Amazon:", responseData.Errors);
      throw new Error(responseData.Errors[0].Message);
    }
    
    if (!responseData.SearchResult || !responseData.SearchResult.Items) {
        return { data: [] };
    }

    return { data: responseData.SearchResult.Items as AmazonProduct[] };

  } catch (error) {
    const message = error instanceof Error ? error.message : "Ocorreu um erro desconhecido ao buscar na Amazon.";
    console.error("Erro em searchAmazonAction:", message);
    return { data: null, error: message };
  }
}

async function postToWhatsApp(message: string, groupId: string, token: string): Promise<boolean> {
  const apiUrl = `https://whapi.cloud/api/sendGroupMessage?token=${token}&groupId=${groupId}&text=${encodeURIComponent(message)}`;
  try {
    const response = await fetch(apiUrl, { method: 'POST' });
    if (!response.ok) {
      console.error(`Erro na API Whapi: ${response.status} ${response.statusText}`);
      return false;
    }
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Erro ao postar no WhatsApp:', error);
    return false;
  }
}

export async function sendAmazonToWhatsAppAction(
  products: AmazonProduct[],
  appSettings: AppSettings
): Promise<{ success: boolean; message: string }> {
  const { whapiToken, whapiSelectedGroups, whapiInterval } = appSettings;

  if (!whapiToken || whapiSelectedGroups.length === 0) {
    return { success: false, message: "Configurações do WhatsApp (Token e Grupos) são obrigatórias." };
  }

  let messagesSent = 0;
  for (const product of products) {
    const price = product.Offers?.Listings?.[0]?.Price?.DisplayAmount ?? "N/A";
    const title = product.ItemInfo.Title.DisplayValue;
    const url = product.DetailPageURL;

    const message = `🔥 Oferta Amazon!\n\n*${title}*\n\n💰 *Preço:* ${price}\n\n🔗 *Link:* ${url}`;
    
    for (const group of whapiSelectedGroups) {
      const success = await postToWhatsApp(message, group.id, whapiToken);
      if (success) {
        messagesSent++;
      }
      // Interval between messages to the same group or different groups
      await new Promise(resolve => setTimeout(resolve, (whapiInterval || 5) * 1000));
    }
  }

  if (messagesSent > 0) {
    return { success: true, message: `${messagesSent} mensagens de produtos enviadas com sucesso!` };
  } else {
    return { success: false, message: "Nenhuma mensagem de produto pôde ser enviada." };
  }
}
