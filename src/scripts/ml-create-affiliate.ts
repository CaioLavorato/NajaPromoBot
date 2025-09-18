// scripts/ml-create-affiliate.ts
import fs from 'node:fs/promises';
import path from 'node:path';

// escolhe driver conforme ambiente
const isServerless = !!process.env.AWS_LAMBDA_FUNCTION_VERSION || !!process.env.VERCEL || !!process.env.GOOGLE_CLOUD_PROJECT;

let puppeteer: typeof import('puppeteer');
let chromium: typeof import('@sparticuz/chromium');
if (isServerless) {
  chromium = await import('@sparticuz/chromium');
  puppeteer = (await import('puppeteer-core')).default;
} else {
  puppeteer = (await import('puppeteer')).default;
}

import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import puppeteerExtra from 'puppeteer-extra';

type CreateLinkResult = { status: number; data?: any; raw?: string };

const COOKIES_FILE = path.join(process.cwd(), '.ml-cookies.json'); // persistência simples

async function loadCookies() {
  try {
    const txt = await fs.readFile(COOKIES_FILE, 'utf8');
    return JSON.parse(txt);
  } catch {
    return null;
  }
}
async function saveCookies(cookies: any) {
  try {
    await fs.writeFile(COOKIES_FILE, JSON.stringify(cookies, null, 2), 'utf8');
  } catch { /* ignore */ }
}

export async function createAffiliateLinksWithBrowser(urls: string[], tag: string): Promise<CreateLinkResult> {
  puppeteerExtra.use(StealthPlugin());

  const launchOpts: any = isServerless
    ? {
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      }
    : {
        headless: false, // Em modo local, inicia visível para facilitar o primeiro login
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
        ],
      };

  const browser = await puppeteerExtra.launch(launchOpts);
  const page = await browser.newPage();

  try {
    // headers de navegação típicos
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
    });

    // carrega cookies persistidos (local). Em serverless, você pode gravar em /tmp
    const saved = await loadCookies();
    if (saved?.length) {
      await page.setCookie(...saved);
    }

    // abre o LinkBuilder
    await page.goto('https://www.mercadolivre.com.br/afiliados/linkbuilder', { waitUntil: 'networkidle2', timeout: 120000 });

    // se estiver deslogado, você provavelmente cairá em login ou redirecionos
    let cookies = await page.cookies();
    let csrfCookie = cookies.find(c => c.name === '_csrf');

    if (!csrfCookie) {
      // tenta login manual (primeira vez): rode com headless:false, faça login e depois os cookies ficam salvos localmente
      // aqui só tentamos cair na página de login para facilitar
      await page.goto('https://www.mercadolivre.com.br/login', { waitUntil: 'networkidle2', timeout: 120000 });
      // Dê alguns segundos para SSO/redireciono automático (se houver)
      await new Promise(resolve => setTimeout(resolve, 8000));

      // volta ao linkbuilder
      await page.goto('https://www.mercadolivre.com.br/afiliados/linkbuilder', { waitUntil: 'networkidle2', timeout: 120000 });

      cookies = await page.cookies();
      csrfCookie = cookies.find(c => c.name === '_csrf');

      if (!csrfCookie) {
        // persiste o estado atual para inspeção
        await saveCookies(cookies);
        return { status: 401, raw: 'Sessão não encontrada (_csrf ausente). Faça o login na janela do navegador que abriu.' };
      }
    }

    // a partir daqui temos sessão; persiste cookies atualizados
    await saveCookies(cookies);

    // chamada no contexto do site (leva cookies/CSRF automaticamente)
    const payload = { urls: sanitizeUrls(urls), tag };
    const result = await page.evaluate(async (payload) => {
      // inclui credentials para garantir envio de cookies
      const resp = await fetch(
        'https://www.mercadolivre.com.br/affiliate-program/api/v2/affiliates/createLink',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': 'https://www.mercadolivre.com.br',
            'Referer': 'https://www.mercadolivre.com.br/afiliados/linkbuilder',
            'Accept': 'application/json, text/plain, */*',
          },
          credentials: 'include',
          body: JSON.stringify(payload),
        }
      );

      const text = await resp.text();
      try {
        return { status: resp.status, data: JSON.parse(text) };
      } catch {
        return { status: resp.status, raw: text };
      }
    }, payload);

    return result as CreateLinkResult;
  } finally {
    await browser.close();
  }
}

function sanitizeUrls(input: string[]): string[] {
  return (input || [])
    .filter((u) => typeof u === 'string' && u.trim())
    .map((u) => {
      try {
        const url = new URL(u);
        url.hash = '';
        const drop = new Set([
          'polycard_client','deal_print_id','position','tracking_id','wid','sid',
          'matt_word','matt_tool','forceInApp','ref'
        ]);
        [...url.searchParams.keys()].forEach(k => { if (drop.has(k)) url.searchParams.delete(k); });
        return url.toString();
      } catch { return ''; }
    })
    .filter(Boolean);
}
