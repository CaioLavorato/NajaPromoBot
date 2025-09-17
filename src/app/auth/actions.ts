'use server';

import { headers, cookies } from 'next/headers';
import crypto from 'crypto';
import { saveToken } from '@/lib/meli';

// ------------- helpers -------------
function b64url(buf: Buffer) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function makeCodeVerifier() {
  // 43–128 chars (RFC7636). 96 bytes -> 128 chars aprox, ok.
  return b64url(crypto.randomBytes(96));
}
function makeCodeChallengeS256(verifier: string) {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return b64url(hash);
}

// Sempre que possível use PUBLIC_BASE_URL (https obrigatório no ML)
function getRedirectUri() {
  const envBase = process.env.PUBLIC_BASE_URL; // ex: https://seu-dominio.com
  if (envBase) return `${envBase.replace(/\/+$/,'')}/auth/callback`;

  const h = headers();
  const host = h.get('x-forwarded-host') || h.get('host') || '';
  const xfproto = h.get('x-forwarded-proto') || ''; // pode vir "https, http"
  const proto = (xfproto.split(',')[0] || '').trim() || (host.includes('localhost') ? 'http' : 'https');
  return `${proto}://${host}/auth/callback`;
}

// ------------- Ações -------------
export async function generateMeliAuthUrlAction(clientId?: string): Promise<{ success: boolean, authUrl?: string, error?: string }> {
  const ML_CLIENT_ID = clientId || process.env.ML_CLIENT_ID;
  if (!ML_CLIENT_ID) return { success: false, error: 'Client ID não configurado.' };

  try {
    const redirectUri = getRedirectUri();

    // PKCE
    const verifier = makeCodeVerifier();
    const challenge = makeCodeChallengeS256(verifier);

    // guarda o verifier em cookie (servidor vai ler no /callback)
    cookies().set('meli_pkce_verifier', verifier, {
      httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 600 // 10 min
    });

    // opcional: state anti-CSRF
    const state = crypto.randomBytes(16).toString('hex');
    cookies().set('meli_oauth_state', state, {
      httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 600
    });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: ML_CLIENT_ID,
      redirect_uri: redirectUri,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state
    });

    const authUrl = `https://auth.mercadolivre.com.br/authorization?${params.toString()}`;
    return { success: true, authUrl };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro interno.';
    return { success: false, error: msg };
  }
}

export async function exchangeMeliCodeAction(code: string, passedClientId?: string, passedClientSecret?: string)
: Promise<{ success: boolean; accessToken?: string; raw?: any; error?: string }> {
  try {
    if (!code) return { success: false, error: 'Código de autorização não fornecido.' };

    const client_id = passedClientId || process.env.ML_CLIENT_ID;
    const client_secret = passedClientSecret || process.env.ML_CLIENT_SECRET;
    if (!client_id || !client_secret) return { success: false, error: 'Credenciais do aplicativo não configuradas.' };

    const redirect_uri = getRedirectUri();

    // lê o PKCE verifier salvo no cookie
    const verifier = cookies().get('meli_pkce_verifier')?.value;
    const stateCookie = cookies().get('meli_oauth_state')?.value;

    // (Opcional) se você capturar o 'state' da query na page, valide aqui
    // if (stateFromQuery && stateCookie && stateFromQuery !== stateCookie) { ... }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id,
      client_secret,
      code,
      redirect_uri,
    });

    // Inclui o PKCE apenas se existir (se o app exigir, é obrigatório)
    if (verifier) body.set('code_verifier', verifier);

    const resp = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body
    });

    const data = await resp.json();

    if (!resp.ok) {
      // devolve mensagem detalhada para debugar
      const err = data?.error_description || data?.message || JSON.stringify(data);
      console.error('Erro ML OAuth:', err);
      return { success: false, error: err || 'Falha ao trocar o código pelo token.', raw: data };
    }

    // limpeza dos cookies efêmeros
    cookies().set('meli_pkce_verifier', '', { path: '/', maxAge: 0 });
    cookies().set('meli_oauth_state', '', { path: '/', maxAge: 0 });

    // Salva o token (access e refresh) no lado do servidor
    await saveToken(data);

    return { success: true, accessToken: data.access_token, raw: data };
  } catch (error) {
    console.error('Erro na troca de token ML:', error);
    const msg = error instanceof Error ? error.message : 'Erro interno.';
    return { success: false, error: msg };
  }
}
