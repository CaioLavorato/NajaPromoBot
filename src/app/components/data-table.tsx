
import Image from 'next/image';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Offer } from '@/lib/types';
import { ExternalLink } from 'lucide-react';

type DataTableProps = {
  offers: Offer[];
};

export default function DataTable({ offers }: DataTableProps) {
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || typeof value === 'undefined') return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Imagem</TableHead>
            <TableHead>Chamada</TableHead>
            <TableHead>Título</TableHead>
            <TableHead className="text-right">Desconto</TableHead>
            <TableHead className="text-right">Preço Original</TableHead>
            <TableHead className="text-right">Preço da Oferta</TableHead>
            <TableHead>Link</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {offers.map((offer, index) => (
            <TableRow key={`${offer.id}-${index}`}>
              <TableCell>
                {offer.image ? (
                  <Image
                    src={offer.image}
                    alt={offer.title}
                    width={64}
                    height={64}
                    className="rounded-md object-cover"
                    unoptimized // As image sources are external and can change
                  />
                ) : (
                  <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                    ?
                  </div>
                )}
              </TableCell>
              <TableCell className="font-medium font-headline">{offer.headline}</TableCell>
              <TableCell className="max-w-xs truncate">{offer.title}</TableCell>
              <TableCell className="text-right">
                {offer.discount_pct && offer.discount_pct > 0 ? (
                  <Badge variant="destructive">{offer.discount_pct}% OFF</Badge>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell className="text-right line-through text-muted-foreground">
                {formatCurrency(
                  typeof offer.price_from === 'string'
                    ? parseFloat(offer.price_from)
                    : offer.price_from
                )}
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(offer.price)}
              </TableCell>
              <TableCell>
                <a
                  href={offer.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
