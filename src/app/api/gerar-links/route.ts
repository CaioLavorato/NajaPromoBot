// app/api/gerar-links/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/meli';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { urls, tag } = await req.json();
    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'Nenhuma URL fornecida.' }, { status: 400 });
    }

    // A tag é opcional, mas se fornecida, deve ser uma string
    if (tag && typeof tag !== 'string') {
        return NextResponse.json({ error: 'A tag do afiliado, se fornecida, deve ser uma string.' }, { status: 400 });
    }

    const token = await getValidAccessToken();

    const resp = await fetch('https://api.mercadolibre.com/affiliate-program/api/v2/affiliates/createLink', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ urls, tag: tag || undefined }), // Envia a tag apenas se ela existir
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error("Erro da API ML ao gerar links:", data);
      const errorMessage = data.message || 'Erro desconhecido ao gerar links de afiliado.';
      return NextResponse.json({ error: errorMessage, details: data }, { status: resp.status });
    }

    return NextResponse.json({ success: true, links: data.urls });
  } catch (err: any) {
    console.error("Erro interno no endpoint /api/gerar-links:", err);
    // Trata o erro de token expirado/inválido de forma mais clara
    if (err.message && err.message.includes('autentique-se novamente')) {
        return NextResponse.json({ error: 'Sessão com Mercado Livre expirada. Por favor, autentique-se novamente na aba de Configurações.' }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || 'Erro interno do servidor' }, { status: 500 });
  }
}
