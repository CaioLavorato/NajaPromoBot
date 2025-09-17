
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ServerCrash, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { exchangeMeliCodeAction } from '@/app/auth/actions';

export default function MeliCallbackPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processando autenticação...');

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setMessage(`Erro na autenticação: ${searchParams.get('error_description') || error}`);
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage('Código de autorização não encontrado.');
      return;
    }

    const performTokenExchange = async () => {
      const meliAppId = sessionStorage.getItem('meli_app_id');
      const meliClientSecret = sessionStorage.getItem('meli_client_secret');

      if (!meliAppId || !meliClientSecret) {
        setStatus('error');
        setMessage('App ID ou Client Secret não encontrado. Por favor, tente autenticar novamente a partir da página de configurações.');
        return;
      }
      
      const result = await exchangeMeliCodeAction(code, meliAppId, meliClientSecret);

      if (result.success) {
        setStatus('success');
        setMessage('Autenticação com Mercado Livre concluída com sucesso! Você já pode fechar esta aba.');
        // Em um app real, você salvaria este token de forma segura, por exemplo, no localStorage.
        // localStorage.setItem('meli_access_token', result.accessToken); 
        console.log('Token de Acesso:', result.accessToken);
      } else {
        setStatus('error');
        setMessage(result.error || 'Ocorreu um erro desconhecido.');
      }
      
      sessionStorage.removeItem('meli_app_id');
      sessionStorage.removeItem('meli_client_secret');
    };

    performTokenExchange();

  }, [searchParams]);

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p>{message}</p>
          </div>
        );
      case 'success':
        return (
          <div className="flex flex-col items-center gap-4 text-center">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="font-semibold">{message}</p>
            <Button onClick={() => window.close()}>Fechar Aba</Button>
          </div>
        );
      case 'error':
        return (
          <div className="flex flex-col items-center gap-4 text-center">
            <ServerCrash className="h-12 w-12 text-destructive" />
            <p className="font-semibold text-destructive">{message}</p>
            <Button onClick={() => window.close()} variant="destructive">Fechar Aba</Button>
          </div>
        );
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Autenticação com Mercado Livre</CardTitle>
          <CardDescription>Aguarde enquanto conectamos sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </main>
  );
}
