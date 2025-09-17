
'use server';

import { headers } from 'next/headers';

function getRedirectUri() {
  const headersList = headers();
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || '';
  const proto = headersList.get('x-forwarded-proto') || 'http';
  const redirectUri = `${proto}://${host}/auth/callback`;
  return redirectUri;
}

export async function generateMeliAuthUrlAction(clientId: string): Promise<{ success: boolean, authUrl?: string, error?: string }> {
  if (!clientId) {
    return { success: false, error: 'Client ID não fornecido.' };
  }
  try {
    const redirectUri = getRedirectUri();
    const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    return { success: true, authUrl };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro interno no servidor.';
    return { success: false, error: errorMessage };
  }
}

export async function exchangeMeliCodeAction(
    code: string, 
    clientId: string, 
    clientSecret: string
): Promise<{ success: boolean; accessToken?: string; error?: string }> {
  try {
    if (!code) {
      return { success: false, error: 'Código de autorização não fornecido.' };
    }
    if (!clientId || !clientSecret) {
      return { success: false, error: 'Credenciais do aplicativo não fornecidas.' };
    }

    const redirectUri = getRedirectUri();

    const tokenResponse = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Erro ao obter token do Mercado Livre:', tokenData);
      return { success: false, error: tokenData.message || 'Falha ao trocar o código pelo token.' };
    }
    
    console.log("Token recebido do Mercado Livre:", tokenData);

    return { success: true, accessToken: tokenData.access_token };
  } catch (error) {
    console.error('Erro na Ação de troca de token do Mercado Livre:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro interno no servidor.';
    return { success: false, error: errorMessage };
  }
}
