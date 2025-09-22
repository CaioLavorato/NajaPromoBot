
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
import type { AppSettings, ShopeeProduct, Offer } from '@/lib/types';
import { searchShopeeAction } from '@/app/actions/shopee';
import { sendToWhatsAppAction } from '@/app/actions/whatsapp';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

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
  
const handleSendToWhatsApp = async (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();

  if (products.length === 0) {
    toast({ variant: 'destructive', title: 'Nenhum produto para enviar' });
    return;
  }
  if (!appSettings.whapiToken || appSettings.whapiSelectedGroups.length === 0) {
    toast({
      variant: 'destructive',
      title: 'WhatsApp Não Configurado',
      description: 'Por favor, configure seu Token e selecione ao menos um grupo na aba de Configurações.',
    });
    return;
  }

  // Helpers seguros
  const toNumber = (v: any): number | null => {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

  // Monta as offers a partir dos produtos da Shopee
  const offers: Offer[] = products.map((p) => {
    const price = toNumber(p?.price_info?.current_price);
    const orig  = toNumber(p?.price_info?.original_price);

    // discount_rate geralmente vem 0~1; converte para % quando existir
    const rate = toNumber(p?.price_info?.discount_rate); // pode ser 0~1, 0~100, null
    let pctFromApi: number | null = null;
    if (rate !== null) {
      pctFromApi = rate <= 1 ? rate * 100 : rate; // aceita 0~1 ou 0~100
      pctFromApi = clamp(Math.round(pctFromApi));
    }

    // preço de/por coerente (mantemos números; o flow já formata)
    let price_from: number | '' = '';
    if (orig !== null && orig > 0) price_from = orig;

    // Se não houver original mas temos % e price, reconstruímos
    if (price_from === '' && price !== null && pctFromApi !== null && pctFromApi > 0 && pctFromApi < 100) {
      const denom = 1 - pctFromApi / 100;
      if (denom > 0) {
        price_from = Math.round((price / denom) * 100) / 100;
      }
    }

    // Desconto final: prefere API; senão calcula de price_from/price
    let discount_pct: number | undefined = undefined;
    if (pctFromApi !== null) {
      discount_pct = pctFromApi;
    } else if (price_from !== '' && price !== null && price_from > price && price_from > 0) {
      discount_pct = clamp(Math.round(((price_from - price) / price_from) * 100));
    }

    return {
      id: String(p?.item_id ?? ''),
      headline: '',
      title: p?.item_name ?? '',
      price,                              // number | null
      price_from,                         // number | '' (flow sabe lidar)
      coupon: '',
      permalink: p?.affiliate_link ?? '',
      image: p?.image_url ?? '',
      discount_pct,                       // number | undefined
      advertiser_name: 'Shopee',
    } as Offer;
  });

  // FormData básico
  const formData = new FormData();
  formData.append('whapiToken', appSettings.whapiToken);
  formData.append('whapiGroupIds', JSON.stringify(appSettings.whapiSelectedGroups.map((g) => g.id)));
  formData.append('whapiInterval', String(appSettings.whapiInterval));
  formData.append('whapiSendLimit', String(appSettings.whapiSendLimit));

  // 👇 CONTROLE DE FREQUÊNCIA: evita bloqueio por “última postagem ausente”
  const storedLast =
    typeof window !== 'undefined' ? window.localStorage.getItem('whapi:lastPostedAt') || '' : '';
  const fallback6h = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  formData.append('whapiLastPostedAt', storedLast || fallback6h);
  formData.append('whapiMinCooldown', String(appSettings.whapiMinCooldown ?? 30)); // minutos
  formData.append('whapiForce', String(appSettings.whapiForce ?? false)); // true para forçar envio

  startWhatsAppTransition(async () => {
    try {
      const result = await sendToWhatsAppAction(offers, formData);
      if (result.success) {
        // Persiste “última postagem” para as próximas checagens
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('whapi:lastPostedAt', new Date().toISOString());
        }
        toast({ title: 'Sucesso', description: result.message });
      } else {
        toast({ variant: 'destructive', title: 'Falha no WhatsApp', description: result.message });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro inesperado',
        description: err?.message || 'Ocorreu um erro desconhecido ao enviar para o WhatsApp.',
      });
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
          <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="isLowestPriceGuarantee" name="isLowestPriceGuarantee" />
                <Label htmlFor="isLowestPriceGuarantee">Garantia de Menor Preço</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="isOfficialShop" name="isOfficialShop" />
                <Label htmlFor="isOfficialShop">Apenas Lojas Oficiais</Label>
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
