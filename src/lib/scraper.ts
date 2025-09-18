
import * as cheerio from 'cheerio';
import type { Offer } from './types';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
};

async function httpFetch(
  url: string,
  retries: number = 3,
  backoff: number = 1.5
): Promise<Response> {
  let lastError: Error | null = null;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (res.ok || res.status === 404) {
        return res;
      }
      if (res.status === 429 || res.status === 503) {
        await new Promise(resolve => setTimeout(resolve, backoff * (i + 1) * 1000));
        continue;
      }
      throw new Error(`HTTP error! status: ${res.status}`);
    } catch (e: any) {
      lastError = e;
      await new Promise(resolve => setTimeout(resolve, backoff * (i + 1) * 1000));
    }
  }
  throw lastError || new Error('HTTP request failed');
}

function cleanNum(s: string | null | undefined): number | null {
  if (!s) return null;
  s = s.replace(/\./g, '').replace(/\s/g, '').replace(',', '.');
  try {
    return parseFloat(s);
  } catch {
    return null;
  }
}

const LISTING_PARAMS_DROP = new Set([
  'searchVariation', 'position', 'search_layout', 'deal_print_id', 'tracking_id',
  'reco_backend', 'reco_client', 'reco_item_pos', 'reco_backend_type', 'reco_id',
  'c_id', 'c_uid', 'source', 'is_advertising', 'wid', 'sid', 'polycard_client',
]);

export function normalizePermalink(u: string): string {
  if (!u) return u;
  try {
    let url = new URL(u);
    const originalHash = url.hash;

    // Lida com múltiplos redirecionamentos de clique aninhados
    while (url.hostname.includes('click.mercadolivre.com.br') && url.searchParams.has('url')) {
      const realUrl = url.searchParams.get('url');
      if (realUrl) {
        url = new URL(realUrl);
      } else {
        break; // Sai do loop se não houver mais url aninhada
      }
    }
    
    const params = new URLSearchParams(url.search);
    for (const key of Array.from(params.keys())) {
      if (LISTING_PARAMS_DROP.has(key)) {
        params.delete(key);
      }
    }
    url.search = params.toString();
    
    // O hash original pode conter informações de rastreamento, mas também de variantes
    // Se o novo hash estiver vazio, usa o hash original, senão usa o da URL extraída
    url.hash = url.hash || originalHash;

    return url.href;
  } catch {
    return u;
  }
}

function parseAndesMoney(element: cheerio.Cheerio<cheerio.Element>): number | null {
  if (!element.length) return null;
  let target = element.is('.andes-money-amount')
    ? element
    : element.find('.andes-money-amount');
  if (!target.length) {
    return cleanNum(element.text());
  }

  const fraction = target.find('.andes-money-amount__fraction').text().trim();
  const cents = target.find('.andes-money-amount__cents').text().trim();

  if (fraction) {
    return cleanNum(cents ? `${fraction},${cents}` : fraction);
  }
  return cleanNum(target.text());
}

function normalizeItem(card: cheerio.Cheerio<cheerio.Element>, baseUrl: string): Offer | null {
  const a = card.find('a.poly-component__title, a.ui-search-link, a.poly-component__title-wrapper a').first();
  if (!a.length) return null;

  const href = a.attr('href') || '';
  if (!href) return null;

  const title = a.text().trim();
  let image = card.find('img').attr('data-src') || card.find('img').attr('src') || '';
  if (image.startsWith('data:image')) image = '';

  try {
    image = new URL(image, baseUrl).href;
  } catch {}

  const priceNode =
    card.find('.poly-price__current .andes-money-amount')
      .first() ||
    card.find('.andes-money-amount:not(.andes-money-amount--previous)')
      .first() ||
    card.find('.price-tag').first();
  
  const price = parseAndesMoney(priceNode);

  const prevNode =
    card.find('s.andes-money-amount--previous')
      .first() ||
    card.find('.andes-money-amount--previous')
      .first() ||
    card.find('.price-tag--light, .price-tag-strike, s').first();
  
  const price_from = parseAndesMoney(prevNode);
  
  let itemId = card.attr('data-id') || '';
  if (!itemId) {
    const match = href.match(/(MLB\d{6,})/);
    if (match) itemId = match[1];
  }

  return {
    id: itemId,
    headline: '',
    title: title,
    price_from: price_from ?? '',
    price: price,
    coupon: '',
    permalink: normalizePermalink(new URL(href, baseUrl).href),
    image: image,
  };
}

const PRELOAD_RE = /window\.__PRELOADED_STATE__\s*=\s*({.*?});\s*<\/script>/s;

function extractResultsFromJson(html: string, baseUrl: string): Offer[] {
    const match = html.match(PRELOAD_RE);
    if (!match) return [];
    
    try {
        const state = JSON.parse(match[1]);
        const items: Offer[] = [];
        const seen = new Set<string>();

        const walk = (node: any) => {
            if (typeof node === 'object' && node !== null) {
                if (node.permalink && node.title && !seen.has(node.permalink)) {
                    const price = node.price ? (typeof node.price === 'object' ? node.price.amount : node.price) : null;
                    const price_from = node.original_price || null;
                    
                    const offer: Offer = {
                        id: node.id || '',
                        headline: '',
                        title: node.title,
                        price: cleanNum(String(price)),
                        price_from: cleanNum(String(price_from)) ?? '',
                        coupon: '',
                        permalink: normalizePermalink(new URL(node.permalink, baseUrl).href),
                        image: node.thumbnail || '',
                    };
                    items.push(offer);
                    seen.add(node.permalink);
                }
                Object.values(node).forEach(walk);
            } else if (Array.isArray(node)) {
                node.forEach(walk);
            }
        };

        walk(state);
        return items;
    } catch (error) {
        console.error('Error parsing __PRELOADED_STATE__', error);
        return [];
    }
}


export async function scrapeOffersUrls(
  urls: string[],
  maxItems: number = 300
): Promise<Offer[]> {
  const items: Offer[] = [];
  const seen = new Set<string>();

  for (const rawUrl of urls) {
    if (items.length >= maxItems) break;

    try {
      const url = new URL(rawUrl);
      url.hash = ''; // Remove fragment for server request
      const response = await httpFetch(url.href);
      const html = await response.text();
      const $ = cheerio.load(html);

      const cards = $('div.ui-search-result__wrapper, li.ui-search-layout__item, div.poly-card');
      
      let foundOnPage = 0;
      if (cards.length > 0) {
          cards.each((_, el) => {
              if (items.length >= maxItems) return false;
              const item = normalizeItem($(el), url.href);
              if (item && !seen.has(item.permalink)) {
                  items.push(item);
                  seen.add(item.permalink);
                  foundOnPage++;
              }
          });
      }

      if (foundOnPage === 0) {
        const jsonItems = extractResultsFromJson(html, url.href);
        for (const item of jsonItems) {
            if (items.length >= maxItems) break;
            if (item && !seen.has(item.permalink)) {
                items.push(item);
                seen.add(item.permalink);
            }
        }
      }

    } catch (error) {
      console.error(`Failed to scrape ${rawUrl}:`, error);
    }
    
    await new Promise(resolve => setTimeout(resolve, 600)); // Be nice
  }

  return items.slice(0, maxItems);
}
