// src/lib/meli.ts
import { cookies } from 'next/headers';

type MeliTokenData = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
};

export async function saveToken(data: MeliTokenData): Promise<void> {
  const now = new Date();
  
  // Access token (curta duração)
  const accessExpires = new Date(now.getTime() + data.expires_in * 1000);
  cookies().set('meli_access_token', data.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax',
    path: '/',
    expires: accessExpires,
  });

  // Refresh token (longa duração, ex: 6 meses)
  const refreshExpires = new Date(now.getTime() + 6 * 30 * 24 * 60 * 60 * 1000);
  cookies().set('meli_refresh_token', data.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax',
    path: '/',
    expires: refreshExpires,
  });
}

async function refreshToken(currentRefreshToken: string): Promise<MeliTokenData> {
  const client_id = process.env.ML_CLIENT_ID;
  const client_secret = process.env.ML_CLIENT_SECRET;

  if (!client_id || !client_secret) {
    throw new Error('Credenciais do Mercado Livre não configuradas no ambiente.');
  }

  const resp = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id,
      client_secret,
      refresh_token: currentRefreshToken,
    }),
  });

  const data = await resp.json();

  if (!resp.ok) {
    console.error('Erro ao renovar token ML:', data);
    // Se o refresh token falhar, limpa os cookies para forçar novo login
    cookies().set('meli_access_token', '', { path: '/', maxAge: 0 });
    cookies().set('meli_refresh_token', '', { path: '/', maxAge: 0 });
    throw new Error(data.message || 'Falha ao renovar o token de acesso. Por favor, autentique-se novamente.');
  }

  // Salva os novos tokens (access e refresh) nos cookies
  await saveToken(data);
  
  return data;
}

export async function getValidAccessToken(): Promise<string> {
  const accessToken = cookies().get('meli_access_token')?.value;

  // Se o access token existir e for válido, retorna ele.
  if (accessToken) {
    return accessToken;
  }

  // Se não houver access token, tenta usar o refresh token.
  const refreshTokenValue = cookies().get('meli_refresh_token')?.value;
  if (!refreshTokenValue) {
    throw new Error('Sessão expirada. Por favor, autentique-se novamente.');
  }
  
  console.log('Token do Mercado Livre expirado ou ausente. Renovando...');
  const newData = await refreshToken(refreshTokenValue);
  return newData.access_token;
}
