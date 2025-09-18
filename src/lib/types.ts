export type Offer = {
  id: string;
  headline: string;
  title: string;
  price_from: number | string;
  price: number | null;
  coupon: string;
  permalink: string;
  image: string;
  discount_pct?: number;
};

export type WhapiGroup = {
  id: string;
  name: string;
}

export type AppSettings = {
  whapiToken: string;
  whapiSelectedGroups: WhapiGroup[];
  whapiInterval: number;
  whapiSendLimit: number;
  amazonPartnerTag: string;
  amazonAccessKey: string;
  amazonSecretKey: string;
  shopeeAppId?: string;
  shopeeAppKey?: string;
  awinApiKey?: string;
  awinAdvertiserIds?: string;
};

export type AmazonProduct = {
  ASIN: string;
  DetailPageURL: string;
  ItemInfo: {
    Title: {
      DisplayValue: string;
    };
    Features?: {
      DisplayValues: string[];
    };
  };
  Images: {
    Primary: {
      Large: {
        URL: string;
      };
    };
  };
  Offers?: {
    Listings: {
      Price: {
        DisplayAmount: string;
        Amount: number;
      };
      Saving?: {
        DisplayAmount: string;
        Percentage: number;
      };
    }[];
  };
};

export type ShopeeProduct = {
  item_id: number;
  shop_id: number;
  item_name: string;
  image_url: string;
  price_info: {
    original_price: number;
    current_price: number;
    discount_rate: number;
  };
  commission_rate: number;
  affiliate_link: string;
};


export type AwinProduct = {
  "aw_deep_link": string;
  "product_name": string;
  "aw_product_id": string;
  "advertiser_name": string;
  "store_price": string;
  "product_price": string;
  "image_url": string;
};

export type AwinOffer = Offer & {
    advertiser_name: string;
}
