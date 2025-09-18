"use client";

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { useFormState, useFormStatus } from 'react-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, Search, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AppSettings, AmazonProduct } from '@/lib/types';
import { searchAmazonAction, sendAmazonToWhatsAppAction } from '@/app/actions/amazon';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';

function SearchSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Loader2 className="animate-spin" /> : <Search />}
      Buscar Produtos
    </Button>
  );
}

function WhatsAppSubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full">
            {pending ? <Loader2 className="animate-spin" /> : <Send />}
            Enviar para WhatsApp
        </Button>
    );
}

type AmazonTabProps = {
  appSettings: AppSettings;
};

export default function AmazonTab({ appSettings }: AmazonTabProps) {
  const { toast } = useToast();
  const [products, setProducts] = useState<AmazonProduct[]>([]);
  const [isWhatsAppPending, startWhatsAppTransition] = useTransition();

  const searchActionWithSettings = searchAmazonAction.bind(null, appSettings);
  const [searchState, formAction] = useFormState(searchActionWithSettings, { data: null });

  useState(() => {
    if (searchState?.data) {
      setProducts(searchState.data);
      toast({ title: 'Busca Concluída', description: `${searchState.data.length} produtos encontrados.` });
    }
    if (searchState?.error) {
      toast({ variant: 'destructive', title: 'Falha na Busca', description: searchState.error });
    }
  });
  
  const handleSendToWhatsApp = async (formData: FormData) => {
    if (products.length === 0) {
      toast({ variant: 'destructive', title: 'Nenhum produto para enviar' });
      return;
    }
    
    startWhatsAppTransition(async () => {
      const result = await sendAmazonToWhatsAppAction(products, appSettings);
      if (result.success) {
        toast({ title: 'Sucesso', description: result.message });
      } else {
        toast({ variant: 'destructive', title: 'Falha no WhatsApp', description: result.message });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buscar Produtos na Amazon</CardTitle>
        <CardDescription>
          Use palavras-chave para encontrar produtos e enviá-los para o WhatsApp. As credenciais são gerenciadas na aba de Configurações.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="keywords">Palavras-chave</Label>
            <Input id="keywords" name="keywords" placeholder="Ex: smartphone 5g, monitor ultrawide" required />
          </div>
          <SearchSubmitButton />
        </form>

        {products.length > 0 ? (
          <div className="space-y-6">
            <h3 className="font-headline text-2xl font-semibold">Resultados da Busca ({products.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(product => (
                <Card key={product.ASIN} className="flex flex-col">
                  <CardHeader>
                    <Image
                      src={product.Images.Primary.Large.URL}
                      alt={product.ItemInfo.Title.DisplayValue}
                      width={300}
                      height={300}
                      className="rounded-md object-contain aspect-square mx-auto"
                    />
                  </CardHeader>
                  <CardContent className="flex-grow space-y-2">
                    <p className="font-semibold text-sm leading-snug" title={product.ItemInfo.Title.DisplayValue}>
                      {product.ItemInfo.Title.DisplayValue.substring(0, 100)}...
                    </p>
                    <div className="flex items-center justify-between">
                       {product.Offers?.Listings[0].Price.DisplayAmount ? (
                          <p className="text-lg font-bold text-primary">{product.Offers?.Listings[0].Price.DisplayAmount}</p>
                       ) : <p className="text-muted-foreground">Preço indisponível</p>}

                       {product.Offers?.Listings[0].Saving && (
                          <Badge variant="destructive">{product.Offers?.Listings[0].Saving.Percentage}% OFF</Badge>
                       )}
                    </div>
                  </CardContent>
                   <CardContent>
                     <a href={product.DetailPageURL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                        <ExternalLink className="h-4 w-4" />
                        Ver na Amazon
                      </a>
                   </CardContent>
                </Card>
              ))}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>📱 Enviar para o WhatsApp</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action={handleSendToWhatsApp}>
                         <WhatsAppSubmitButton />
                    </form>
                </CardContent>
            </Card>

          </div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Nenhum Resultado</AlertTitle>
            <AlertDescription>
              Faça uma busca para ver os produtos aqui.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
