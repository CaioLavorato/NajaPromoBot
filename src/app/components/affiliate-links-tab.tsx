"use client";

import { useState, useEffect } from 'react';
import type { Offer } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { downloadCSV, downloadXLSX } from '@/lib/export';
import { generateHeadline } from '@/lib/headline-generator';
import DataTable from './data-table';
import PermalinkTools from './permalink-tools';
import { Upload, Replace, Download } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

type AffiliateLinksTabProps = {
  offers: Offer[] | null;
  setOffers: (offers: Offer[] | null) => void;
};

export default function AffiliateLinksTab({ offers, setOffers }: AffiliateLinksTabProps) {
  const { toast } = useToast();
  const [useLastSession, setUseLastSession] = useState(true);
  const [affiliateLinks, setAffiliateLinks] = useState('');
  const [regenerateHeadline, setRegenerateHeadline] = useState(true);
  const [modifiedOffers, setModifiedOffers] = useState<Offer[] | null>(null);
  const [uploadedOffers, setUploadedOffers] = useState<Offer[] | null>(null);

  const sourceOffers = useLastSession ? offers : uploadedOffers;

  useEffect(() => {
    // If user switches back to using session data, clear modified data if source is null
    if (useLastSession && !offers) {
      setModifiedOffers(null);
    }
  }, [useLastSession, offers]);
  

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        let parsedOffers: Offer[];
        if (file.name.toLowerCase().endsWith('.csv')) {
          const result = Papa.parse(data as string, { header: true, skipEmptyLines: true });
          parsedOffers = result.data as Offer[];
        } else {
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          parsedOffers = XLSX.utils.sheet_to_json(worksheet) as Offer[];
        }
        setUploadedOffers(parsedOffers);
        setModifiedOffers(null);
        toast({ title: 'File loaded successfully', description: `Loaded ${parsedOffers.length} offers.` });
      } catch (error) {
        toast({ variant: 'destructive', title: 'File Read Error', description: 'Could not parse the uploaded file.' });
      }
    };
    if (file.name.toLowerCase().endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const handleApply = () => {
    if (!sourceOffers) {
      toast({ variant: 'destructive', title: 'No Source Data', description: 'Please scrape or upload offers first.' });
      return;
    }
    const links = affiliateLinks.split('\n').filter(l => l.trim() !== '');
    if (links.length === 0) {
      toast({ variant: 'destructive', title: 'No Affiliate Links', description: 'Please paste at least one affiliate link.' });
      return;
    }

    const newOffers = sourceOffers.map((offer, index) => {
      let newOffer = { ...offer };
      if (index < links.length) {
        newOffer.permalink = links[index];
      }
      if (regenerateHeadline) {
        newOffer.headline = generateHeadline(newOffer.title, newOffer.price_from, newOffer.price);
      }
      return newOffer;
    });

    setModifiedOffers(newOffers);
    toast({ title: 'Success', description: `Replaced ${Math.min(links.length, newOffers.length)} permalinks.` });
  };
  
  const displayOffers = modifiedOffers || sourceOffers;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Affiliate Link Replacement</CardTitle>
        <CardDescription>
          Use the scraped data or upload a file, then paste your affiliate links to replace the original permalinks.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-2">
          <Checkbox id="use-last-session" checked={useLastSession} onCheckedChange={(checked) => setUseLastSession(!!checked)} />
          <Label htmlFor="use-last-session">Use data from Scrape tab</Label>
        </div>

        {!useLastSession && (
          <div className="space-y-2">
            <Label htmlFor="file-upload">Upload CSV/XLSX</Label>
            <Input id="file-upload" type="file" accept=".csv, .xlsx" onChange={handleFileChange} />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="affiliate-links">Affiliate Links (one per line, in order)</Label>
          <Textarea id="affiliate-links" value={affiliateLinks} onChange={(e) => setAffiliateLinks(e.target.value)} rows={6} placeholder="https://..." />
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox id="regenerate-headline" checked={regenerateHeadline} onCheckedChange={(checked) => setRegenerateHeadline(!!checked)} />
          <Label htmlFor="regenerate-headline">Generate/update headline by discount</Label>
        </div>

        <Button onClick={handleApply} className="w-full"><Replace /> Apply Replacement</Button>
        
        {displayOffers && displayOffers.length > 0 && (
          <div className="space-y-8 pt-4">
            <section>
              <h3 className='font-headline text-2xl font-semibold mb-4'>Updated Offers ({displayOffers.length})</h3>
              <DataTable offers={displayOffers} />
              <div className="flex gap-2 mt-4">
                <Button onClick={() => downloadCSV(displayOffers, 'offers_affiliate.csv')} variant="outline"><Download/> Download CSV</Button>
                <Button onClick={() => downloadXLSX(displayOffers, 'offers_affiliate.xlsx')} variant="outline"><Download/> Download XLSX</Button>
              </div>
            </section>
            <section>
              <PermalinkTools offers={displayOffers} />
            </section>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
