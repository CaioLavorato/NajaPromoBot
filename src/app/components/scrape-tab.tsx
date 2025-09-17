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
      Scrape Now
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
      toast({ title: 'Scraping Complete', description: scrapeState.message });
    }
    if (scrapeState?.error) {
      toast({ variant: 'destructive', title: 'Scraping Failed', description: scrapeState.error });
    }
  }, [scrapeState, setOffers, toast]);
  
  const handleApplyAffiliateLinks = () => {
    if (!offers) {
      toast({ variant: 'destructive', title: 'No Source Data', description: 'Please scrape offers first.' });
      return;
    }
    const links = affiliateLinks.split('\n').filter(l => l.trim() !== '');
    if (links.length === 0) {
      toast({ variant: 'destructive', title: 'No Affiliate Links', description: 'Please paste at least one affiliate link.' });
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
    toast({ title: 'Success', description: `Replaced ${Math.min(links.length, newOffers.length)} permalinks.` });
  };


  const handleSendToWhatsApp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!offers || offers.length === 0) {
      toast({ variant: 'destructive', title: 'No offers to send' });
      return;
    }
     if (!whapiConfig.groupId || !whapiConfig.token) {
      toast({ variant: 'destructive', title: 'WhatsApp Not Configured', description: 'Please set your Whapi Group ID and Token in the Settings tab.'});
      return;
    }

    const formData = new FormData();
    formData.append('whapiGroupId', whapiConfig.groupId);
    formData.append('whapiToken', whapiConfig.token);

    startWhatsAppTransition(async () => {
      const result = await sendToWhatsAppAction(offers, formData);
      if (result.success) {
        toast({ title: 'Success', description: result.message });
      } else {
        toast({ variant: 'destructive', title: 'WhatsApp Failed', description: result.message });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scraper Configuration</CardTitle>
        <CardDescription>
          Paste Mercado Livre offer URLs, set parameters, scrape, edit, and post.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="urlsText">Offer URLs (one per line)</Label>
            <Textarea id="urlsText" name="urlsText" defaultValue={DEFAULT_URLS} rows={6} required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxItems">Max Items</Label>
              <Input id="maxItems" name="maxItems" type="number" defaultValue={300} min={10} max={1000} step={10} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minDiscount">Min Discount (%)</Label>
              <Input id="minDiscount" name="minDiscount" type="number" defaultValue={0} min={0} max={100} step={5} />
            </div>
            <div className="flex items-end space-y-2">
              <div className="flex items-center space-x-2 h-10">
                <Checkbox id="doGenerateHeadline" name="doGenerateHeadline" defaultChecked />
                <Label htmlFor="doGenerateHeadline">Generate Headlines</Label>
              </div>
            </div>
          </div>
          
          <div className='flex gap-4'>
            <SubmitButton />
            <Button type="button" variant="outline" className="w-full" onClick={() => setOffers(null)}>
              <Trash2 /> Clear Results
            </Button>
          </div>
        </form>
      </CardContent>

      {offers === null ? (
        <CardFooter>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Results Yet</AlertTitle>
            <AlertDescription>
              Configure and click "Scrape Now" to see results.
            </AlertDescription>
          </Alert>
        </CardFooter>
      ) : (
        <CardContent className="space-y-8">
            <section className="grid md:grid-cols-2 gap-8">
               <Card>
                  <CardHeader>
                      <CardTitle>🔗 Affiliate Link Replacement</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <div className="space-y-2">
                          <Label htmlFor="affiliate-links">Affiliate Links (one per line, in order)</Label>
                          <Textarea id="affiliate-links" value={affiliateLinks} onChange={(e) => setAffiliateLinks(e.target.value)} rows={6} placeholder="https://..." />
                      </div>
                      <div className="flex items-center space-x-2">
                          <Checkbox id="regenerate-headline" checked={regenerateHeadline} onCheckedChange={(checked) => setRegenerateHeadline(!!checked)} />
                          <Label htmlFor="regenerate-headline">Generate/update headline by discount</Label>
                      </div>
                      <Button onClick={handleApplyAffiliateLinks} className="w-full"><Replace /> Apply Replacement</Button>
                  </CardContent>
               </Card>
               <PermalinkTools offers={offers} />
            </section>
        
          <section>
            <h3 className='font-headline text-2xl font-semibold mb-4'>Scraped Offers ({offers.length})</h3>
            <DataTable offers={offers} />
            <div className="flex gap-2 mt-4">
              <Button onClick={() => downloadCSV(offers, 'offers.csv')} variant="outline"><Download/> Download CSV</Button>
              <Button onClick={() => downloadXLSX(offers, 'offers.xlsx')} variant="outline"><Download/> Download XLSX</Button>
            </div>
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>📱 Send to WhatsApp</CardTitle>
                <CardDescription>Post a summary of these offers to a WhatsApp group.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendToWhatsApp} className="space-y-4">
                   <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Ready to Send</AlertTitle>
                    <AlertDescription>
                      Whapi configuration is managed in the Settings tab. Click send to post the offers.
                    </AlertDescription>
                  </Alert>
                  <Button type="submit" className="w-full" disabled={isWhatsAppPending}>
                    {isWhatsAppPending ? <Loader2 className="animate-spin" /> : <Send />}
                    Send to Group
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
