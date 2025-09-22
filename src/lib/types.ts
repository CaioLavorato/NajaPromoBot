export type Offer = {
  id: string;
  headline: string;
  title: string;
  /** Pode vir como número (ex.: 199.9) ou string do scraper; o backend trata */
  price_from: number | string;
  price: number | null;
  coupon: string;
  permalink: string;
  /** Use '' quando não tiver imagem; o backend valida URL http/https */
  image: string;
  discount_pct?: number;
  editing?: boolean;
  /** Para Awin, Amazon, Shopee */
  advertiser_name?: string;
};

export type WhapiGroup = {
  id: string;
  name: string;
};

export type AppSettings = {
  whapiToken: string;
  whapiSelectedGroups: WhapiGroup[];
  whapiInterval: number;
  whapiSendLimit: number;

  /** Amazon PA-API */
  amazonPartnerTag: string;
  amazonAccessKey: string;
  amazonSecretKey: string;

  /** Shopee */
  shopeeAppId?: string;
  shopeeAppKey?: string;

  /** Awin */
  awinApiKey?: string;
  awinAdvertiserIds?: string;

  /** 👇 Novos (opcionais) — usados no controle de frequência */
  /** minutos de cooldown entre postagens (ex.: 30). Default usado no client: 30 */
  whapiMinCooldown?: number;
  /** se true, ignora bloqueio do controlPostFrequency */
  whapiForce?: boolean;
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
    Listings: Array<{
      Price: {
        DisplayAmount: string;
        Amount: number;
      };
      Saving?: {
        DisplayAmount: string;
        Percentage: number; // geralmente 0..100
      };
    }>;
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
    /** Pode vir 0..1 (fração) ou 0..100 (percentual), o handler normaliza */
    discount_rate: number;
  };
  commission_rate: number;
  affiliate_link: string;
};

export type AwinProduct = {
  aw_deep_link: string;
  product_name: string;
  aw_product_id: string;
  advertiser_name: string;
  store_price: string;   // pode vir como string; será parseado
  product_price: string; // idem
  image_url: string;
};

export type AwinOffer = Offer & {
  advertiser_name: string;
};
