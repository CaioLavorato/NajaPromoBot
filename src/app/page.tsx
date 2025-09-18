import MeliAffiliator from '@/app/components/meli-affiliator';
import { ThemeToggle } from '@/app/components/theme-toggle';
import { NajaIcon } from '@/app/components/naja-icon';

export default function Home() {
  return (
    <main className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col gap-8">
        <header className="relative text-center">
          <div className="flex items-center justify-center gap-4">
             <NajaIcon className="h-12 w-12 text-primary" />
            <h1 className="font-headline text-4xl font-bold tracking-tight lg:text-5xl">
              NajaPromo
            </h1>
          </div>
          <p className="mt-2 text-lg text-muted-foreground">
            Seu assistente para caçar, gerenciar e publicar as melhores ofertas da web.
          </p>
           <div className="absolute top-0 right-0">
            <ThemeToggle />
          </div>
        </header>
        <MeliAffiliator />
      </div>
    </main>
  );
}
