
"use client";

import { useState, useTransition, useActionState } from 'react';
import Image from 'next/image';
import { useFormStatus } from 'react-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, Search, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AppSettings, AmazonProduct, Offer } from '@/lib/types';
import { searchAmazonAction } from '@/app/actions/amazon';
import { sendToWhatsAppAction } from '@/app/actions/whatsapp';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


// Categorias da Amazon Brasil (Browse Node IDs)
const amazonCategories = [
    { id: "16209062011", name: "Eletrônicos" },
    { id: "6740748011", name: "Livros" },
    { id: "16244105011", name: "Casa" },
    { id: "16243883011", "name": "Cozinha" },
    { id: "16209071011", name: "Computadores e Informática" },
    { id: "16249921011", name: "Games" },
    { id: "16243801011", name: "Beleza" },
    { id: "16243821011", name: "Cuidados Pessoais" },
    { id: "16243729011", name: "Brinquedos e Jogos" },
    { id: "16243642011", name: "Roupas, Calçados e Joias" },
    { id: "16243576011", name: "Esportes e Aventura" },
];


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
  const [searchState, formAction, isSearchPending] = useActionState(searchActionWithSettings, { data: null });

  useState(() => {
    if (searchState?.data) {
      setProducts(searchState.data);
      toast({ title: 'Busca Concluída', description: `${searchState.data.length} produtos encontrados.` });
    }
    if (searchState?.error) {
      toast({ variant: 'destructive', title: 'Falha na Busca', description: searchState.error });
    }
  });
  
  const handleSendToWhatsApp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (products.length === 0) {
      toast({ variant: 'destructive', title: 'Nenhum produto para enviar' });
      return;
    }
     if (!appSettings.whapiToken || appSettings.whapiSelectedGroups.length === 0) {
      toast({ variant: 'destructive', title: 'WhatsApp Não Configurado', description: 'Por favor, configure seu Token e selecione ao menos um grupo na aba de Configurações.'});
      return;
    }

    const offers: Offer[] = products.map(p => ({
        id: p.ASIN,
        headline: '',
        title: p.ItemInfo.Title.DisplayValue,
        price: p.Offers?.Listings[0]?.Price?.Amount ?? null,
        price_from: p.Offers?.Listings[0]?.Saving?.DisplayAmount ? (p.Offers.Listings[0].Price.Amount / (1 - (p.Offers.Listings[0].Saving.Percentage / 100))) : '',
        coupon: '',
        permalink: p.DetailPageURL,
        image: p.Images.Primary.Large.URL,
        discount_pct: p.Offers?.Listings[0]?.Saving?.Percentage,
        advertiser_name: 'Amazon',
    }));

    const formData = new FormData();
    formData.append('whapiToken', appSettings.whapiToken);
    formData.append('whapiGroupIds', JSON.stringify(appSettings.whapiSelectedGroups.map(g => g.id)));
    formData.append('whapiInterval', String(appSettings.whapiInterval));
    formData.append('whapiSendLimit', String(appSettings.whapiSendLimit));
    
    startWhatsAppTransition(async () => {
      const result = await sendToWhatsAppAction(offers, formData);
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
          Busque por palavra-chave, categoria ou ambos. As credenciais são gerenciadas na aba de Configurações.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="keywords">Palavras-chave (Opcional)</Label>
              <Input id="keywords" name="keywords" placeholder="Ex: smartphone 5g, monitor ultrawide" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="browseNodeId">Categoria (Opcional)</Label>
                 <Select name="browseNodeId">
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                        {amazonCategories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
              <Label htmlFor="minDiscount">Desconto Mín. (%)</Label>
              <Input id="minDiscount" name="minDiscount" type="number" defaultValue={0} min={0} max={100} step={5} />
            </div>
          </div>
          {searchState?.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro na Validação</AlertTitle>
              <AlertDescription>{searchState.error}</AlertDescription>
            </Alert>
          )}
          <SearchSubmitButton />
        </form>

        {isSearchPending && (
             <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
             </div>
        )}

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
                    <form onSubmit={handleSendToWhatsApp}>
                         <WhatsAppSubmitButton />
                    </form>
                </CardContent>
            </Card>

          </div>
        ) : (
          !isSearchPending && searchState?.data?.length === 0 && (
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Nenhum Resultado</AlertTitle>
                <AlertDescription>
                Sua busca não retornou resultados. Tente outros termos ou categorias.
                </AlertDescription>
            </Alert>
          )
        )}
      </CardContent>
    </Card>
  );
}
