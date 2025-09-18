
"use client";

import { useState, useTransition, useActionState } from 'react';
import Image from 'next/image';
import { useFormStatus } from 'react-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, Search, Send, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AppSettings, ShopeeProduct } from '@/lib/types';
import { searchShopeeAction, sendShopeeToWhatsAppAction } from '@/app/actions/shopee';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Categorias da Shopee - pode ser expandido
const shopeeCategories = [
    { id: "11000002", name: "Eletrônicos" },
    { id: "11000550", name: "Casa e Decoração" },
    { id: "11001155", name: "Roupas Femininas" },
    { id: "11001156", name: "Roupas Masculinas" },
    { id: "11011831", name: "Saúde e Beleza" },
    { id: "11012110", name: "Bebês e Crianças" },
];

function SearchSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Loader2 className="animate-spin" /> : <Search />}
      Buscar Ofertas na Shopee
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

type ShopeeTabProps = {
  appSettings: AppSettings;
};

export default function ShopeeTab({ appSettings }: ShopeeTabProps) {
  const { toast } = useToast();
  const [products, setProducts] = useState<ShopeeProduct[]>([]);
  const [isWhatsAppPending, startWhatsAppTransition] = useTransition();

  const searchActionWithSettings = searchShopeeAction.bind(null, appSettings);
  const [searchState, formAction, isSearchPending] = useActionState(searchActionWithSettings, { data: null });

  useState(() => {
    if (searchState?.data) {
      setProducts(searchState.data);
      toast({ title: 'Busca Concluída', description: `${searchState.data.length} produtos encontrados na Shopee.` });
    }
    if (searchState?.error) {
      toast({ variant: 'destructive', title: 'Falha na Busca', description: searchState.error });
    }
  });
  
  const handleSendToWhatsApp = async () => {
    if (products.length === 0) {
      toast({ variant: 'destructive', title: 'Nenhum produto para enviar' });
      return;
    }
    
    startWhatsAppTransition(async () => {
      const result = await sendShopeeToWhatsAppAction(products, appSettings);
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
        <CardTitle>Buscar Ofertas na Shopee</CardTitle>
        <CardDescription>
          Busque por palavra-chave, categoria, ou ambos. As credenciais são gerenciadas na aba de Configurações.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="keywords">Palavras-chave (Opcional)</Label>
              <Input id="keywords" name="keywords" placeholder="Ex: fone bluetooth, smartwatch" />
            </div>
             <div className="space-y-2">
                <Label htmlFor="categoryId">Categoria (Opcional)</Label>
                <Select name="categoryId">
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                        {shopeeCategories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
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

        {products.length > 0 && !isSearchPending ? (
          <div className="space-y-6">
            <h3 className="font-headline text-2xl font-semibold">Resultados da Busca ({products.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(product => (
                <Card key={product.item_id} className="flex flex-col">
                  <CardHeader>
                    <Image
                      src={product.image_url}
                      alt={product.item_name}
                      width={300}
                      height={300}
                      className="rounded-md object-contain aspect-square mx-auto"
                    />
                  </CardHeader>
                  <CardContent className="flex-grow space-y-2">
                    <p className="font-semibold text-sm leading-snug" title={product.item_name}>
                      {product.item_name.substring(0, 100)}{product.item_name.length > 100 ? "..." : ""}
                    </p>
                    <div className="flex items-center justify-between">
                       <p className="text-lg font-bold text-primary">
                         {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price_info.current_price)}
                       </p>
                       {product.price_info.original_price > product.price_info.current_price && (
                          <Badge variant="destructive">{Math.round(product.price_info.discount_rate * 100)}% OFF</Badge>
                       )}
                    </div>
                     <p className="text-sm text-muted-foreground line-through">
                         de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price_info.original_price)}
                     </p>
                  </CardContent>
                   <CardContent>
                     <a href={product.affiliate_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                        <ExternalLink className="h-4 w-4" />
                        Ver na Shopee
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
                    <form onSubmit={(e) => { e.preventDefault(); handleSendToWhatsApp(); }}>
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

    