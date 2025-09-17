// src/lib/meli.ts
import fs from 'fs/promises';
import path from 'path';

// Em produção, use um banco de dados ou um armazenamento seguro.
// O arquivo token.json deve estar no .gitignore em um projeto real.
const TOKEN_PATH = path.resolve(process.cwd(), 'token.json');

type MeliToken = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Timestamp de quando o token expira
};

async function readToken(): Promise<MeliToken | null> {
  try {
    const data = await fs.readFile(TOKEN_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Se o arquivo não existir ou for inválido, retorna null.
    return null;
  }
}

export async function saveToken(data: any): Promise<void> {
  const token: MeliToken = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    // Define a expiração para 50 minutos a partir de agora (a duração é de 60 min)
    // para ter uma margem de segurança.
    expiresAt: Date.now() + data.expires_in * 1000 - 10 * 60 * 1000,
  };
  await fs.writeFile(TOKEN_PATH, JSON.stringify(token, null, 2), 'utf-8');
}

async function refreshToken(currentRefreshToken: string): Promise<MeliToken> {
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
    throw new Error(data.message || 'Falha ao renovar o token de acesso.');
  }

  await saveToken(data);
  const newToken = await readToken();
  if (!newToken) throw new Error('Falha ao ler o token recém-renovado.');
  
  return newToken;
}

export async function getValidAccessToken(): Promise<string> {
  const token = await readToken();

  if (!token) {
    throw new Error('Nenhum token encontrado. Por favor, autentique-se primeiro.');
  }

  // Verifica se o token está expirado ou vai expirar em breve
  if (Date.now() >= token.expiresAt) {
    console.log('Token do Mercado Livre expirado. Renovando...');
    const newToken = await refreshToken(token.refreshToken);
    return newToken.accessToken;
  }

  return token.accessToken;
}
