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
