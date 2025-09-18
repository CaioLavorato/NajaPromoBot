
"use client";

import { useEffect, useTransition, useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, Wand2, Trash2, Download, Send, Replace, Link as LinkIcon, ClipboardPaste, PlusCircle } from 'lucide-react';

import type { Offer, AppSettings } from '@/lib/types';
import { scrapeOffersAction } from '@/app/actions/scrape';
import { sendToWhatsAppAction } from '@/app/actions/whatsapp';
import { useToast } from '@/hooks/use-toast';
import DataTable from './data-table';
import PermalinkTools from './permalink-tools';
import { downloadCSV, downloadXLSX } from '@/lib/export';
import { generateHeadline } from '@/lib/headline-generator';

type ScrapeTabProps = {
  offers: Offer[] | null;
  setOffers: (offers: Offer[] | null) => void;
  appSettings: AppSettings;
};

const DEFAULT_URLS = [
  "https://www.mercadolivre.com.br/ofertas?container_id=MLB779362-1",
  "https://www.mercadolivre.com.br/ofertas?container_id=MLB779362-1&promotion_type=lightning",
].join('\n');

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full bg-primary hover:bg-primary/90">
      {pending ? <Loader2 className="animate-spin" /> : <Wand2 />}
      Extrair Agora
    </Button>
  );
}

export default function ScrapeTab({ offers, setOffers, appSettings }: ScrapeTabProps) {
  const { toast } = useToast();
  const [scrapeState, formAction] = useActionState(scrapeOffersAction, { data: null });
  const [isWhatsAppPending, startWhatsAppTransition] = useTransition();
  const [isGeneratingLinks, startGeneratingLinksTransition] = useTransition();
  
  const [regenerateHeadline, setRegenerateHeadline] = useState(true);
  const [affiliateTag, setAffiliateTag] = useState('');
  const [pastedLinks, setPastedLinks] = useState('');


  useEffect(() => {
    if (scrapeState?.data) {
      setOffers(scrapeState.data);
    }
    if (scrapeState?.message) {
      toast({ title: 'Extração Concluída', description: scrapeState.message });
    }
    if (scrapeState?.error) {
      toast({ variant: 'destructive', title: 'Falha na Extração', description: scrapeState.error });
    }
  }, [scrapeState, setOffers, toast]);
  
  const handleGenerateAffiliateLinks = () => {
    if (!offers || offers.length === 0) {
      toast({ variant: 'destructive', title: 'Nenhuma oferta', description: 'Por favor, extraia ofertas primeiro.' });
      return;
    }
    
    startGeneratingLinksTransition(async () => {
      try {
        const originalUrls = offers.map(o => o.permalink);
        
        const response = await fetch('/api/gerar-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: originalUrls, tag: affiliateTag || undefined }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Falha ao gerar links de afiliado.');
        }
        
        const newLinksMap = new Map(result.links.map((item: { short_url: string; original_url: string }) => [item.original_url, item.short_url]));
        
        const newOffers = offers.map(offer => {
            const newLink = newLinksMap.get(offer.permalink);
            let newOffer = { ...offer };
            if (newLink) {
                newOffer.permalink = newLink;
            }
            if (regenerateHeadline) {
                newOffer.headline = generateHeadline(newOffer.title, newOffer.price_from, newOffer.price);
            }
            return newOffer;
        });

        setOffers(newOffers);
        toast({ title: 'Sucesso', description: `${newLinksMap.size} links de afiliado foram gerados e aplicados.` });

      } catch (error) {
        const message = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
        toast({ variant: 'destructive', title: 'Erro ao Gerar Links', description: message });
      }
    });
  };

  const handleApplyPastedLinks = () => {
    if (!offers || offers.length === 0) {
      toast({ variant: 'destructive', title: 'Nenhuma oferta para modificar.' });
      return;
    }
    const linksToApply = pastedLinks.split('\n').map(l => l.trim()).filter(Boolean);
    if (linksToApply.length === 0) {
      toast({ variant: 'destructive', title: 'Nenhum link colado.' });
      return;
    }
    
    const newOffers = offers.map((offer, index) => {
        if (index < linksToApply.length) {
            return { ...offer, permalink: linksToApply[index] };
        }
        return offer;
    });

    setOffers(newOffers);
    toast({ title: 'Sucesso', description: `Foram substituídos ${Math.min(offers.length, linksToApply.length)} links.` });
    setPastedLinks('');
  };


  const handleSendToWhatsApp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!offers || offers.length === 0) {
      toast({ variant: 'destructive', title: 'Nenhuma oferta para enviar' });
      return;
    }
     if (!appSettings.whapiToken || appSettings.whapiSelectedGroups.length === 0) {
      toast({ variant: 'destructive', title: 'WhatsApp Não Configurado', description: 'Por favor, configure seu Token e selecione ao menos um grupo na aba de Configurações.'});
      return;
    }

    const formData = new FormData();
    formData.append('whapiToken', appSettings.whapiToken);
    formData.append('whapiGroupIds', JSON.stringify(appSettings.whapiSelectedGroups.map(g => g.id)));

    startWhatsAppTransition(async () => {
      const result = await sendToWhatsAppAction(offers, formData);
      if (result.success) {
        toast({ title: 'Sucesso', description: result.message });
      } else {
        toast({ variant: 'destructive', title: 'Falha no WhatsApp', description: result.message });
      }
    });
  };

  const handleAddOffer = () => {
    const newOffer: Offer = {
      id: `manual-${new Date().getTime()}`,
      headline: '',
      title: '',
      price_from: '',
      price: null,
      coupon: '',
      permalink: '',
      image: '',
      editing: true, // Start in editing mode
    };
    setOffers(offers ? [newOffer, ...offers] : [newOffer]);
  };

  const handleDeleteOffer = (index: number) => {
    setOffers(offers ? offers.filter((_, i) => i !== index) : null);
  };

  const handleUpdateOffer = (index: number, updatedOffer: Offer) => {
    if (offers) {
      const newOffers = [...offers];
      newOffers[index] = updatedOffer;
      setOffers(newOffers);
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração do Scraper</CardTitle>
        <CardDescription>
          Cole URLs de ofertas do Mercado Livre, defina parâmetros, extraia, edite e poste.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="urlsText">URLs de Ofertas (uma por linha)</Label>
            <Textarea id="urlsText" name="urlsText" defaultValue={DEFAULT_URLS} rows={6} required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxItems">Máx. de Itens</Label>
              <Input id="maxItems" name="maxItems" type="number" defaultValue={300} min={10} max={1000} step={10} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minDiscount">Desconto Mín. (%)</Label>
              <Input id="minDiscount" name="minDiscount" type="number" defaultValue={0} min={0} max={100} step={5} />
            </div>
            <div className="flex items-end space-y-2">
              <div className="flex items-center space-x-2 h-10">
                <Checkbox id="doGenerateHeadline" name="doGenerateHeadline" defaultChecked />
                <Label htmlFor="doGenerateHeadline">Gerar Chamadas</Label>
              </div>
            </div>
          </div>
          
          <div className='flex gap-4'>
            <SubmitButton />
            <Button type="button" variant="outline" className="w-full" onClick={() => setOffers(null)}>
              <Trash2 /> Limpar Resultados
            </Button>
          </div>
        </form>
      </CardContent>

      {offers === null ? (
        <CardFooter>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Nenhum Resultado Ainda</AlertTitle>
            <AlertDescription>
              Configure e clique em "Extrair Agora" para ver os resultados.
            </AlertDescription>
          </Alert>
        </CardFooter>
      ) : (
        <CardContent className="space-y-8">
            <section className="grid md:grid-cols-2 gap-8">
               <div className="flex flex-col gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle>🔗 Geração de Links de Afiliado</CardTitle>
                            <CardDescription>
                                Gere links de afiliado para as ofertas extraídas usando a API do Mercado Livre.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="affiliate-tag">Tag de Afiliado (Opcional)</Label>
                                <Input id="affiliate-tag" value={affiliateTag} onChange={(e) => setAffiliateTag(e.target.value)} placeholder="Ex: meu-site-123" />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="regenerate-headline" checked={regenerateHeadline} onCheckedChange={(checked) => setRegenerateHeadline(!!checked)} />
                                <Label htmlFor="regenerate-headline">Gerar/atualizar chamada por desconto</Label>
                            </div>
                            <Button onClick={handleGenerateAffiliateLinks} disabled={isGeneratingLinks} className="w-full">
                                {isGeneratingLinks ? <Loader2 className="animate-spin" /> : <LinkIcon />}
                                Gerar Links de Afiliado
                            </Button>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>📋 Colar Links Manualmente</CardTitle>
                            <CardDescription>
                            Cole uma lista de links de afiliado para substituir os links da tabela na ordem.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                            <Label htmlFor="pasted-links">Links de Afiliado (um por linha)</Label>
                            <Textarea
                                id="pasted-links"
                                value={pastedLinks}
                                onChange={(e) => setPastedLinks(e.target.value)}
                                placeholder="https://mercadolivre.com/sec/link1..."
                                rows={3}
                            />
                            </div>
                            <Button onClick={handleApplyPastedLinks} className="w-full">
                            <ClipboardPaste />
                            Substituir Links
                            </Button>
                        </CardContent>
                    </Card>
               </div>

               <div>
                 <PermalinkTools offers={offers} />
               </div>
            </section>
        
          <section>
            <div className="flex justify-between items-center mb-4">
                <h3 className='font-headline text-2xl font-semibold'>Ofertas Extraídas ({offers.length})</h3>
                 <Button onClick={handleAddOffer} variant="outline">
                    <PlusCircle /> Adicionar Linha
                </Button>
            </div>
            <DataTable 
                offers={offers} 
                onUpdateOffer={handleUpdateOffer}
                onDeleteOffer={handleDeleteOffer}
            />
            <div className="flex gap-2 mt-4">
              <Button onClick={() => downloadCSV(offers, 'ofertas.csv')} variant="outline"><Download/> Baixar CSV</Button>
              <Button onClick={() => downloadXLSX(offers, 'ofertas.xlsx')} variant="outline"><Download/> Baixar XLSX</Button>
            </div>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>📱 Enviar para o WhatsApp</CardTitle>
                <CardDescription>Poste um resumo destas ofertas em um grupo do WhatsApp.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendToWhatsApp} className="space-y-4">
                   <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Pronto para Enviar</AlertTitle>
                    <AlertDescription>
                      A configuração do Whapi é gerenciada na aba de Configurações. Clique em enviar para postar as ofertas.
                    </AlertDescription>
                  </Alert>
                  <Button type="submit" disabled={isWhatsAppPending} className="w-full">
                    {isWhatsAppPending ? <Loader2 className="animate-spin" /> : <Send />}
                    Enviar para WhatsApp
                  </Button>
                </form>
              </CardContent>
            </Card>
          </section>
        </CardContent>
      )}
    </Card>
  );
}
