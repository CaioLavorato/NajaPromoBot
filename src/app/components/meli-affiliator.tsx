"use client";

import { useState } from 'react';
import type { Offer, AppSettings } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ScrapeTab from '@/app/components/scrape-tab';
import SettingsTab from '@/app/components/settings-tab';
import AmazonTab from '@/app/components/amazon-tab';
import ShopeeTab from '@/app/components/shopee-tab';
import AwinTab from '@/app/components/awin-tab';
import { Bot, Settings, ShoppingCart, Store, Rss } from 'lucide-react';


export default function MeliAffiliator() {
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings>({ 
    whapiToken: '',
    whapiSelectedGroups: [],
    whapiInterval: 25,
    whapiSendLimit: 5,
    amazonPartnerTag: '',
    amazonAccessKey: '',
    amazonSecretKey: '',
    shopeeAppId: '',
    shopeeAppKey: '',
    awinApiKey: '',
    awinAdvertiserIds: '',
  });

  return (
    <Tabs defaultValue="scraper" className="w-full">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="scraper">
          <Bot className="mr-2 h-4 w-4" />
          Mercado Livre
        </TabsTrigger>
        <TabsTrigger value="amazon">
          <ShoppingCart className="mr-2 h-4 w-4" />
          Amazon
        </TabsTrigger>
        <TabsTrigger value="shopee">
          <Store className="mr-2 h-4 w-4" />
          Shopee
        </TabsTrigger>
        <TabsTrigger value="awin">
          <Rss className="mr-2 h-4 w-4" />
          Awin
        </TabsTrigger>
        <TabsTrigger value="settings">
          <Settings className="mr-2 h-4 w-4" />
          Configurações
        </TabsTrigger>
      </TabsList>
      <TabsContent value="scraper">
        <ScrapeTab offers={offers} setOffers={setOffers} appSettings={appSettings} />
      </TabsContent>
       <TabsContent value="amazon">
        <AmazonTab appSettings={appSettings} />
      </TabsContent>
       <TabsContent value="shopee">
        <ShopeeTab appSettings={appSettings} />
      </TabsContent>
      <TabsContent value="awin">
        <AwinTab appSettings={appSettings} />
      </TabsContent>
      <TabsContent value="settings">
        <SettingsTab appSettings={appSettings} setAppSettings={setAppSettings} />
      </TabsContent>
    </Tabs>
  );
}
