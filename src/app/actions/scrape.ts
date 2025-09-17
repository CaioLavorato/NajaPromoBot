"use server";

import { scrapeOffersUrls } from "@/lib/scraper";
import { generateHeadline as localGenerateHeadline } from "@/lib/headline-generator";
import type { Offer } from "@/lib/types";
import { z } from "zod";

const ScrapeSchema = z.object({
  urlsText: z.string().min(1, "Please provide at least one URL."),
  maxItems: z.number().min(10).max(1000),
  doGenerateHeadline: z.boolean(),
  minDiscount: z.number().min(0).max(100),
});

export async function scrapeOffersAction(
  prevState: any,
  formData: FormData
): Promise<{ data: Offer[] | null; error?: string; message?: string }> {

  const validatedFields = ScrapeSchema.safeParse({
    urlsText: formData.get('urlsText'),
    maxItems: Number(formData.get('maxItems')),
    doGenerateHeadline: formData.get('doGenerateHeadline') === 'on',
    minDiscount: Number(formData.get('minDiscount')),
  });

  if (!validatedFields.success) {
    return { data: null, error: validatedFields.error.flatten().fieldErrors.urlsText?.[0] || "Invalid input." };
  }

  const { urlsText, maxItems, doGenerateHeadline, minDiscount } = validatedFields.data;

  try {
    const urls = urlsText.split('\n').map(u => u.trim()).filter(u => u);
    
    let items = await scrapeOffersUrls(urls, maxItems);

    items = items.map(item => {
      let discount_pct = 0;
      try {
        const p0 = parseFloat(String(item.price_from));
        const p1 = parseFloat(String(item.price));
        if (p0 > 0 && p1 > 0 && p1 <= p0) {
          discount_pct = Math.max(0, Math.round(((p0 - p1) / p0) * 100));
        }
      } catch (e) {
        discount_pct = 0;
      }
      return { ...item, discount_pct };
    });
    
    if (minDiscount > 0) {
      items = items.filter(item => (item.discount_pct ?? 0) >= minDiscount);
    }
    
    if (doGenerateHeadline) {
      items = items.map(item => ({
        ...item,
        headline: item.headline || localGenerateHeadline(item.title, item.price_from, item.price),
      }));
    }
    
    if (items.length === 0) {
        return { data: [], message: "No items found matching your criteria." };
    }

    return { data: items, message: `Successfully scraped ${items.length} items.` };
  } catch (error) {
    console.error("Scraping failed:", error);
    return { data: null, error: error instanceof Error ? error.message : "An unknown error occurred during scraping." };
  }
}
