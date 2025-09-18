import puppeteer from 'puppeteer';

type CreateLinkResult = {
  status: number;
  data?: any;
  raw?: string;
};

export async function createAffiliateLinksWithBrowser(urls: string[], tag: string): Promise<CreateLinkResult> {
  const browser = await puppeteer.launch({
    headless: true, // Mude para false para ver o fluxo de login na primeira vez
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    // userDataDir: './.puppeteer-profile-ml' // Descomente para manter a sessão de login
  });
  const page = await browser.newPage();

  try {
    await page.goto('https://www.mercadolivre.com.br/afiliados/linkbuilder', { waitUntil: 'networkidle2', timeout: 120000 });

    const cookies = await page.cookies();
    const csrfCookie = cookies.find(c => c.name === '_csrf');
    if (!csrfCookie) {
      await browser.close();
      return { status: 401, raw: 'Não foi possível localizar cookie _csrf. Provável sessão expirada / não logado.' };
    }
    const csrf = csrfCookie.value;

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
  } finally {
    await browser.close();
  }
}
