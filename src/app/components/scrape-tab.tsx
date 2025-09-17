"use client";

import { useEffect, useState, useTransition, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, Wand2, Trash2, Download, Send, Replace } from 'lucide-react';

import type { Offer } from '@/lib/types';
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
  whapiConfig: { groupId: string; token: string };
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

export default function ScrapeTab({ offers, setOffers, whapiConfig }: ScrapeTabProps) {
  const { toast } = useToast();
  const [scrapeState, formAction] = useActionState(scrapeOffersAction, { data: null });
  const [isWhatsAppPending, startWhatsAppTransition] = useTransition();
  
  const [affiliateLinks, setAffiliateLinks] = useState('');
  const [regenerateHeadline, setRegenerateHeadline] = useState(true);

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
  
  const handleApplyAffiliateLinks = () => {
    if (!offers) {
      toast({ variant: 'destructive', title: 'Nenhum Dado de Origem', description: 'Por favor, extraia ofertas primeiro.' });
      return;
    }
    const links = affiliateLinks.split('\n').filter(l => l.trim() !== '');
    if (links.length === 0) {
      toast({ variant: 'destructive', title: 'Nenhum Link de Afiliado', description: 'Por favor, cole pelo menos um link de afiliado.' });
      return;
    }

    const newOffers = offers.map((offer, index) => {
      let newOffer = { ...offer };
      if (index < links.length) {
        newOffer.permalink = links[index];
      }
      if (regenerateHeadline) {
        newOffer.headline = generateHeadline(newOffer.title, newOffer.price_from, newOffer.price);
      }
      return newOffer;
    });

    setOffers(newOffers);
    toast({ title: 'Sucesso', description: `Substituídos ${Math.min(links.length, newOffers.length)} permalinks.` });
  };


  const handleSendToWhatsApp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!offers || offers.length === 0) {
      toast({ variant: 'destructive', title: 'Nenhuma oferta para enviar' });
      return;
    }
     if (!whapiConfig.groupId || !whapiConfig.token) {
      toast({ variant: 'destructive', title: 'WhatsApp Não Configurado', description: 'Por favor, configure seu ID de Grupo e Token do Whapi na aba de Configurações.'});
      return;
    }

    const formData = new FormData();
    formData.append('whapiGroupId', whapiConfig.groupId);
    formData.append('whapiToken', whapiConfig.token);

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
               <Card>
                  <CardHeader>
                      <CardTitle>🔗 Substituição de Links de Afiliado</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <div className="space-y-2">
                          <Label htmlFor="affiliate-links">Links de Afiliado (um por linha, em ordem)</Label>
                          <Textarea id="affiliate-links" value={affiliateLinks} onChange={(e) => setAffiliateLinks(e.target.value)} rows={6} placeholder="https://..." />
                      </div>
                      <div className="flex items-center space-x-2">
                          <Checkbox id="regenerate-headline" checked={regenerateHeadline} onCheckedChange={(checked) => setRegenerateHeadline(!!checked)} />
                          <Label htmlFor="regenerate-headline">Gerar/atualizar chamada por desconto</Label>
                      </div>
                      <Button onClick={handleApplyAffiliateLinks} className="w-full"><Replace /> Aplicar Substituição</Button>
                  </CardContent>
               </Card>
               <PermalinkTools offers={offers} />
            </section>
        
          <section>
            <h3 className='font-headline text-2xl font-semibold mb-4'>Ofertas Extraídas ({offers.length})</h3>
            <DataTable offers={offers} />
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
