
"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, Loader2, AlertCircle, Send, Trash2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AppSettings, AwinOffer } from "@/lib/types";
import { processAwinFeedAction, sendAwinToWhatsAppAction } from "@/app/actions/awin";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

function ProcessSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Loader2 className="animate-spin" /> : <Download />}
      Baixar e Processar Feed
    </Button>
  );
}

function WhatsAppSubmitButton({ disabled }: { disabled: boolean }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending || disabled} className="w-full">
            {pending ? <Loader2 className="animate-spin" /> : <Send />}
            Enviar para WhatsApp
        </Button>
    );
}

type AwinTabProps = {
  appSettings: AppSettings;
};

export default function AwinTab({ appSettings }: AwinTabProps) {
  const { toast } = useToast();
  const [offers, setOffers] = useState<AwinOffer[]>([]);

  const processActionWithSettings = processAwinFeedAction.bind(null, appSettings);
  const [processState, formAction, isProcessing] = useActionState(processActionWithSettings, { data: null });
  
  const [isWhatsAppPending, startWhatsAppTransition] = useTransition();

  useState(() => {
    if (processState?.data) {
      setOffers(processState.data);
      toast({ title: "Processamento Concluído", description: processState.message });
    }
    if (processState?.error) {
      toast({ variant: "destructive", title: "Falha no Processamento", description: processState.error });
    }
  });
  
  const handleSendToWhatsApp = async (formData: FormData) => {
    if (offers.length === 0) {
      toast({ variant: 'destructive', title: 'Nenhuma oferta para enviar' });
      return;
    }
    
    startWhatsAppTransition(async () => {
      const result = await sendAwinToWhatsAppAction(offers, appSettings);
      if (result.success) {
        toast({ title: 'Sucesso', description: result.message });
      } else {
        toast({ variant: 'destructive', title: 'Falha no WhatsApp', description: result.message });
      }
    });
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || typeof value === 'undefined') return '-';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>Processador de Feed da Awin</CardTitle>
        <CardDescription>
          Baixe o feed de produtos dos seus anunciantes Awin, filtre por desconto e envie para o WhatsApp.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="minDiscount">Desconto Mínimo (%)</Label>
            <Input id="minDiscount" name="minDiscount" type="number" defaultValue={20} min={0} max={100} step={5} />
          </div>
          <ProcessSubmitButton />
           <Button type="button" variant="outline" className="w-full" onClick={() => setOffers([])}>
              <Trash2 /> Limpar Resultados
            </Button>
        </form>

        {isProcessing && (
             <div className="flex flex-col items-center justify-center p-8 text-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-muted-foreground">Baixando, descompactando e processando o feed...<br/>Isso pode levar alguns minutos dependendo do tamanho do feed.</p>
             </div>
        )}

        {offers.length > 0 && !isProcessing && (
          <div className="space-y-6">
            <h3 className="font-headline text-2xl font-semibold">Ofertas do Feed ({offers.length})</h3>
            
            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Imagem</TableHead>
                            <TableHead>Produto</TableHead>
                             <TableHead>Anunciante</TableHead>
                            <TableHead className="text-right">Desconto</TableHead>
                            <TableHead className="text-right">Preço Original</TableHead>
                            <TableHead className="text-right">Preço</TableHead>
                            <TableHead>Link</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {offers.map(offer => (
                            <TableRow key={offer.id}>
                                <TableCell>
                                    <Image src={offer.image} alt={offer.title} width={64} height={64} className="rounded-md object-cover" />
                                </TableCell>
                                <TableCell className="max-w-xs truncate font-medium" title={offer.title}>{offer.title}</TableCell>
                                <TableCell>{offer.advertiser_name}</TableCell>
                                <TableCell className="text-right">
                                    <Badge variant="destructive">{offer.discount_pct}% OFF</Badge>
                                </TableCell>
                                <TableCell className="text-right line-through text-muted-foreground">
                                    {formatCurrency(typeof offer.price_from === 'string' ? parseFloat(offer.price_from) : offer.price_from)}
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                    {formatCurrency(offer.price)}
                                </TableCell>
                                <TableCell>
                                    <a href={offer.permalink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                                        <ExternalLink className="h-4 w-4" /> Ver
                                    </a>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>📱 Enviar para o WhatsApp</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action={handleSendToWhatsApp}>
                         <WhatsAppSubmitButton disabled={offers.length === 0} />
                    </form>
                </CardContent>
            </Card>

          </div>
        )}

        {!isProcessing && processState?.data?.length === 0 && (
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Nenhum Resultado</AlertTitle>
                <AlertDescription>
                Nenhum produto encontrado no feed com o filtro de desconto aplicado. Tente um valor menor.
                </AlertDescription>
            </Alert>
        )}
      </CardContent>
    </Card>
  );
}
