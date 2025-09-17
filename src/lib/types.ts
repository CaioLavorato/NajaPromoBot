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

export type WhapiConfig = {
  token: string;
  selectedGroups: WhapiGroup[];
  interval: number;
  sendLimit: number;
};
