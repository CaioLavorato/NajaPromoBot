
"use server";

import { z } from 'zod';
import crypto from 'crypto';
import type { AppSettings, ShopeeProduct } from '@/lib/types';

const SHOPEE_API_URL = "https://openapi.shopee.com/v2";

const SearchSchema = z.object({
  keywords: z.string().optional(),
  categoryId: z.string().optional(),
  isLowestPriceGuarantee: z.boolean().optional(),
  isOfficialShop: z.boolean().optional(),
}).refine(data => !!data.keywords || !!data.categoryId, {
    message: "Forneça uma palavra-chave ou selecione uma categoria para buscar.",
});

// Função para gerar a assinatura necessária para a API da Shopee
function createShopeeSignature(appId: string, appKey: string, path: string, timestamp: number, body: string): string {
  const baseString = `${appId}${path}${timestamp}${body}`;
  return crypto.createHmac('sha256', appKey).update(baseString).digest('hex');
}

async function getAffiliateLinks(
    appId: string, appKey: string, productLinks: { item_id: number, shop_id: number }[]
): Promise<Map<number, string>> {
    const path = '/product/get_affiliate_link';
    const timestamp = Math.floor(Date.now() / 1000);
    
    const items = productLinks.map(p => ({
        item_id: p.item_id,
        shop_id: p.shop_id,
        promotion_type: 'product_offer'
    }));

    const body = JSON.stringify({ item_promotion_list: items });
    const sign = createShopeeSignature(appId, appKey, path, timestamp, body);

    const url = `${SHOPEE_API_URL}${path}?app_id=${appId}&timestamp=${timestamp}&sign=${sign}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body,
        });
        const data = await response.json();
        
        if (data.error) {
            console.error("Erro ao gerar links de afiliado Shopee:", data.message);
            return new Map();
        }

        const linksMap = new Map<number, string>();
        data.data.item_promotion_list.forEach((item: any) => {
            if (item.affiliate_link) {
                linksMap.set(item.item_id, item.affiliate_link);
            }
        });
        return linksMap;

    } catch (error) {
        console.error("Falha na requisição de links de afiliado Shopee:", error);
        return new Map();
    }
}


export async function searchShopeeAction(
  appSettings: AppSettings,
  prevState: any,
  formData: FormData
): Promise<{ data: ShopeeProduct[] | null; error?: string }> {
  const validatedFields = SearchSchema.safeParse({
    keywords: formData.get('keywords'),
    categoryId: formData.get('categoryId'),
    isLowestPriceGuarantee: formData.get('isLowestPriceGuarantee') === 'on',
    isOfficialShop: formData.get('isOfficialShop') === 'on',
  });

  if (!validatedFields.success) {
    return { data: null, error: validatedFields.error.flatten().fieldErrors._form?.[0] || "Erro de validação." };
  }
  
  const { keywords, categoryId, isLowestPriceGuarantee, isOfficialShop } = validatedFields.data;
  const { shopeeAppId, shopeeAppKey } = appSettings;

  if (!shopeeAppId || !shopeeAppKey) {
    return { data: null, error: "As credenciais da API da Shopee não estão configuradas." };
  }

  const path = '/product/search_item';
  const timestamp = Math.floor(Date.now() / 1000);
  
  const requestBody: any = {
      page_size: 20,
      is_mart_item: false,
      is_lowest_price_guarantee: isLowestPriceGuarantee || false,
      is_official_shop: isOfficialShop || false,
      need_item_affiliate_info: true,
  };
  
  if (keywords) {
      requestBody.keyword = keywords;
  }
  
  if (categoryId) {
      requestBody.category_id_list = [parseInt(categoryId, 10)];
  }

  const bodyString = JSON.stringify(requestBody);
  const sign = createShopeeSignature(shopeeAppId, shopeeAppKey, path, timestamp, bodyString);
  
  const url = `${SHOPEE_API_URL}${path}?app_id=${shopeeAppId}&timestamp=${timestamp}&sign=${sign}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyString,
    });
    
    const responseData = await response.json();

    if (responseData.error) {
      throw new Error(`Erro da API Shopee: ${responseData.message}`);
    }

    if (!responseData.data || !responseData.data.item_list) {
      return { data: [] };
    }

    let products: ShopeeProduct[] = responseData.data.item_list;

    // A API de busca não retorna o link de afiliado, então precisamos buscá-lo
    const productLinksToGenerate = products.map(p => ({ item_id: p.item_id, shop_id: p.shop_id }));
    const affiliateLinksMap = await getAffiliateLinks(shopeeAppId, shopeeAppKey, productLinksToGenerate);

    products = products.map(p => ({
        ...p,
        affiliate_link: affiliateLinksMap.get(p.item_id) || `https://shopee.com.br/product/${p.shop_id}/${p.item_id}`
    }));

    return { data: products };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ocorreu um erro desconhecido ao buscar na Shopee.";
    console.error("Erro em searchShopeeAction:", message);
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

export async function sendShopeeToWhatsAppAction(
  products: ShopeeProduct[],
  appSettings: AppSettings
): Promise<{ success: boolean; message: string }> {
  const { whapiToken, whapiSelectedGroups, whapiInterval } = appSettings;

  if (!whapiToken || whapiSelectedGroups.length === 0) {
    return { success: false, message: "Configurações do WhatsApp (Token e Grupos) são obrigatórias." };
  }

  let messagesSent = 0;
  for (const product of products) {
    const price = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price_info.current_price);
    const originalPrice = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price_info.original_price);

    let message = `🔥 Oferta Shopee!\n\n*${product.item_name}*\n\n💰 *Preço:* ${price}`;
    if (product.price_info.original_price > product.price_info.current_price) {
        message += ` (de ${originalPrice})`;
    }
    message += `\n\n🔗 *Link:* ${product.affiliate_link}`;
    
    for (const group of whapiSelectedGroups) {
      const success = await postToWhatsApp(message, group.id, whapiToken);
      if (success) {
        messagesSent++;
      }
      await new Promise(resolve => setTimeout(resolve, (whapiInterval || 5) * 1000));
    }
  }

  if (messagesSent > 0) {
    return { success: true, message: `${messagesSent} mensagens de produtos da Shopee enviadas com sucesso!` };
  } else {
    return { success: false, message: "Nenhuma mensagem de produto da Shopee pôde ser enviada." };
  }
}
