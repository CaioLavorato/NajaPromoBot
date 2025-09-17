"use client";

import { useState } from 'react';
import type { Offer } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ScrapeTab from '@/app/components/scrape-tab';
import AffiliateLinksTab from '@/app/components/affiliate-links-tab';
import { Bot, Link2 } from 'lucide-react';

export default function MeliAffiliator() {
  const [offers, setOffers] = useState<Offer[] | null>(null);

  return (
    <Tabs defaultValue="scraper" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="scraper">
          <Bot className="mr-2 h-4 w-4" />
          Scrape Offers
        </TabsTrigger>
        <TabsTrigger value="affiliate">
          <Link2 className="mr-2 h-4 w-4" />
          Affiliate Links
        </TabsTrigger>
      </TabsList>
      <TabsContent value="scraper">
        <ScrapeTab offers={offers} setOffers={setOffers} />
      </TabsContent>
      <TabsContent value="affiliate">
        <AffiliateLinksTab offers={offers} setOffers={setOffers} />
      </TabsContent>
    </Tabs>
  );
}
