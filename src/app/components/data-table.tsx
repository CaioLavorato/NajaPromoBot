
import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Offer } from '@/lib/types';
import { ExternalLink, Edit, Trash2, Save, X } from 'lucide-react';

type DataTableProps = {
  offers: Offer[];
  onUpdateOffer: (index: number, offer: Offer) => void;
  onDeleteOffer: (index: number) => void;
};

export default function DataTable({ offers, onUpdateOffer, onDeleteOffer }: DataTableProps) {
  const [editState, setEditState] = useState<Partial<Offer>>({});

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || typeof value === 'undefined') return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleEdit = (offer: Offer, index: number) => {
    onUpdateOffer(index, { ...offer, editing: true });
    setEditState(offer);
  };

  const handleCancel = (offer: Offer, index: number) => {
    onUpdateOffer(index, { ...offer, editing: false });
    setEditState({});
  };

  const handleSave = (index: number) => {
    onUpdateOffer(index, { ...editState as Offer, editing: false });
    setEditState({});
  };
  
  const handleInputChange = (field: keyof Offer, value: string) => {
      let parsedValue: string | number | null = value;
      if (field === 'price' || field === 'price_from') {
          parsedValue = value ? parseFloat(value.replace(',', '.')) : null;
      }
      setEditState(prev => ({ ...prev, [field]: parsedValue }));
  };

  const renderCell = (offer: Offer, index: number) => {
    if (offer.editing) {
      return (
        <TableRow key={`${offer.id}-${index}`}>
          <TableCell>
            <Textarea
              className="h-16 w-32 text-xs"
              placeholder="URL da Imagem"
              value={editState.image}
              onChange={e => handleInputChange('image', e.target.value)}
            />
          </TableCell>
          <TableCell>
            <Input
              placeholder="Chamada..."
              value={editState.headline}
              onChange={e => handleInputChange('headline', e.target.value)}
            />
          </TableCell>
          <TableCell>
            <Textarea
              placeholder="Título do Produto"
              value={editState.title}
              onChange={e => handleInputChange('title', e.target.value)}
            />
          </TableCell>
          <TableCell className="text-right">
            <Input
              className="w-20 text-right"
              type="number"
              placeholder="%"
              value={editState.discount_pct || ''}
              onChange={e => handleInputChange('discount_pct', e.target.value)}
            />
          </TableCell>
          <TableCell className="text-right">
            <Input
              className="w-28 text-right"
              placeholder="0,00"
              value={String(editState.price_from || '')}
              onChange={e => handleInputChange('price_from', e.target.value)}
            />
          </TableCell>
          <TableCell className="text-right">
             <Input
              className="w-28 text-right font-semibold"
              placeholder="0,00"
              value={String(editState.price || '')}
              onChange={e => handleInputChange('price', e.target.value)}
            />
          </TableCell>
           <TableCell>
            <Textarea
              className="h-16 w-32 text-xs"
              placeholder="Permalink"
              value={editState.permalink}
              onChange={e => handleInputChange('permalink', e.target.value)}
            />
          </TableCell>
          <TableCell className="flex gap-2">
            <Button size="icon" onClick={() => handleSave(index)}><Save /></Button>
            <Button size="icon" variant="ghost" onClick={() => handleCancel(offer, index)}><X /></Button>
          </TableCell>
        </TableRow>
      );
    }

    return (
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
         <TableCell className="flex gap-2">
            <Button size="icon" variant="outline" onClick={() => handleEdit(offer, index)}>
                <Edit />
            </Button>
            <Button size="icon" variant="destructive" onClick={() => onDeleteOffer(index)}>
                <Trash2 />
            </Button>
        </TableCell>
      </TableRow>
    );
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
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {offers.map((offer, index) => renderCell(offer, index))}
        </TableBody>
      </Table>
    </div>
  );
}
