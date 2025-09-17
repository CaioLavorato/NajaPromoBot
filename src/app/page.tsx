import MeliAffiliator from '@/app/components/meli-affiliator';

export default function Home() {
  return (
    <main className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col gap-8">
        <header className="text-center">
          <h1 className="font-headline text-4xl font-bold tracking-tight lg:text-5xl">
            MeliAffiliator
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Scrape Mercado Livre offers, manage affiliate links, and post to
            WhatsApp.
          </p>
        </header>
        <MeliAffiliator />
      </div>
    </main>
  );
}
