"use client";

import { useState } from 'react';
import type { Offer } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ScrapeTab from '@/app/components/scrape-tab';
import SettingsTab from '@/app/components/settings-tab';
import { Bot, Settings } from 'lucide-react';
import type { WhapiConfig } from '@/lib/types';

export default function MeliAffiliator() {
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [whapiConfig, setWhapiConfig] = useState<WhapiConfig>({ 
    token: '',
    selectedGroups: [],
    interval: 25,
    sendLimit: 5
  });

  return (
    <Tabs defaultValue="scraper" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="scraper">
          <Bot className="mr-2 h-4 w-4" />
          Extrair e Postar
        </TabsTrigger>
        <TabsTrigger value="settings">
          <Settings className="mr-2 h-4 w-4" />
          Configurações
        </TabsTrigger>
      </TabsList>
      <TabsContent value="scraper">
        <ScrapeTab offers={offers} setOffers={setOffers} whapiConfig={whapiConfig} />
      </TabsContent>
      <TabsContent value="settings">
        <SettingsTab whapiConfig={whapiConfig} setWhapiConfig={setWhapiConfig} />
      </TabsContent>
    </Tabs>
  );
}
