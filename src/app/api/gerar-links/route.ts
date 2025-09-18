// app/api/gerar-links/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAffiliateLinksWithBrowser } from '@/scripts/ml-create-affiliate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Aumenta o timeout para 2 minutos

export async function POST(req: NextRequest) {
  try {
    const { urls, tag } = await req.json();
    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'Nenhuma URL fornecida.' }, { status: 400 });
    }
    if (tag && typeof tag !== 'string') {
        return NextResponse.json({ error: 'A tag do afiliado, se fornecida, deve ser uma string.' }, { status: 400 });
    }

    const result = await createAffiliateLinksWithBrowser(urls, tag || '');
    
    if (result.status === 200 && result.data?.urls) {
      return NextResponse.json({ success: true, links: result.data.urls });
    }
    
    // Constrói uma mensagem de erro mais informativa
    const errorMessage = result.data?.message || result.raw || 'Falha na automação com Puppeteer.';
    console.error("Erro no Puppeteer:", { status: result.status, error: errorMessage });
    return NextResponse.json({ error: `Erro do ML: ${errorMessage}`, details: result.raw }, { status: 502 });

  } catch (err: any) {
    console.error("Erro interno no endpoint /api/gerar-links:", err);
    return NextResponse.json({ error: err.message || 'Erro interno do servidor' }, { status: 500 });
  }
}
