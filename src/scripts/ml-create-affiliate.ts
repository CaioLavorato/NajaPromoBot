import puppeteer from 'puppeteer-core';
import chromium from 'chrome-aws-lambda';

type CreateLinkResult = {
  status: number;
  data?: any;
  raw?: string;
};

export async function createAffiliateLinksWithBrowser(urls: string[], tag: string): Promise<CreateLinkResult> {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath || undefined,
    headless: chromium.headless,
  });
  const page = await browser.newPage();

  try {
    // 1) Abra a página do LinkBuilder 
    await page.goto('https://www.mercadolivre.com.br/afiliados/linkbuilder', { waitUntil: 'networkidle2', timeout: 120000 });

    // 2) Extrai o _csrf diretamente dos cookies atuais
    const cookies = await page.cookies();
    const csrfCookie = cookies.find(c => c.name === '_csrf');
    
    // Se não encontrar o cookie, tenta navegar para a página de login para estabelecer a sessão.
    if (!csrfCookie) {
      console.log('Cookie _csrf não encontrado. Tentando estabelecer sessão...');
      await page.goto('https://www.mercadolivre.com.br/login', { waitUntil: 'networkidle2', timeout: 120000 });
      // Aguarda um tempo para um possível login automático ou redirecionamento
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Tenta novamente após a tentativa de login
      const postLoginCookies = await page.cookies();
      const postLoginCsrfCookie = postLoginCookies.find(c => c.name === '_csrf');

       if (!postLoginCsrfCookie) {
         console.error('Falha ao obter cookie _csrf após tentativa de login.');
         return { status: 401, raw: 'Não foi possível localizar cookie _csrf. Sessão provavelmente expirou ou não está logado.' };
       }
       // Se encontrou após o login, continua com o novo cookie
       console.log('Sessão estabelecida. Prosseguindo com a geração de links.');
       return await performApiCall(page, postLoginCsrfCookie.value, urls, tag);
    }
    
    const csrf = csrfCookie.value;

    // 3) Faz a chamada usando o próprio contexto do navegador
    return await performApiCall(page, csrf, urls, tag);

  } finally {
    await browser.close();
  }
}

async function performApiCall(page: puppeteer.Page, csrf: string, urls: string[], tag: string): Promise<CreateLinkResult> {
    const payload = { urls, tag };
    const result = await page.evaluate(async (payload, csrf) => {
      const resp = await fetch('https://www.mercadolivre.com.br/affiliate-program/api/v2/affiliates/createLink', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrf,
          'Origin': 'https://www.mercadolivre.com.br',
          'Referer': 'https://www.mercadolivre.com.br/afiliados/linkbuilder',
          'Accept': 'application/json, text/plain, */*',
        },
        body: JSON.stringify(payload),
      });

      const text = await resp.text();
      try {
        return { status: resp.status, data: JSON.parse(text) };
      } catch {
        return { status: resp.status, raw: text };
      }
    }, payload, csrf);

    return result as CreateLinkResult;
}
