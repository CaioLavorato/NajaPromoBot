// app/api/gerar-links/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAffiliateLinksWithBrowser } from '@/scripts/ml-create-affiliate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Aumentar o tempo limite máximo para a função de servidor
export const maxDuration = 120; 


export async function POST(req: NextRequest) {
  try {
    const { urls, tag } = await req.json();

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'Nenhuma URL fornecida.' }, { status: 400 });
    }
    if (!tag || typeof tag !== 'string') {
      return NextResponse.json({ error: 'Tag do afiliado ausente.' }, { status: 400 });
    }
    
    const result = await createAffiliateLinksWithBrowser(urls, tag);
    
    if (result.status === 200 && result.data?.urls) {
        return NextResponse.json({ success: true, links: result.data.urls });
    }

    console.error("Falha ao gerar links via Puppeteer:", result.raw || result.data);
    const errorMessage = typeof result.raw === 'string' && result.raw.includes('Não foi possível localizar cookie _csrf')
        ? 'Sessão do Mercado Livre no Puppeteer expirou ou não foi iniciada. Faça o login manual.'
        : 'Erro inesperado ao gerar links com Puppeteer.';

    return NextResponse.json(
      { error: errorMessage, details: result.raw || result.data },
      { status: result.status || 500 }
    );

  } catch (err: any) {
    console.error('Erro interno no endpoint /api/gerar-links:', err);
    return NextResponse.json({ error: err?.message || 'Erro interno do servidor' }, { status: 500 });
  }
}
