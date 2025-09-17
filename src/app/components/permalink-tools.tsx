"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Copy, Download } from 'lucide-react';
import type { Offer } from '@/lib/types';

type PermalinkToolsProps = {
  offers: Offer[];
};

export default function PermalinkTools({ offers }: PermalinkToolsProps) {
  const { toast } = useToast();
  const [startLine, setStartLine] = useState(1);
  const [endLine, setEndLine] = useState(offers.length);

  const allLinks = offers.map(o => o.permalink).join('\n');
  const total = offers.length;

  const handleCopy = (text: string, message: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: 'Sucesso', description: message });
    }).catch(() => {
      toast({ variant: "destructive", title: 'Erro', description: 'Falha ao copiar para a área de transferência.' });
    });
  };

  const handleDownload = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const sliceLinks = offers.slice(startLine - 1, endLine).map(o => o.permalink).join('\n');

  return (
    <Card>
      <CardHeader>
        <CardTitle>📋 Ferramentas de Permalink</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Todos os Permalinks ({total})</Label>
          <Textarea value={allLinks} readOnly rows={5} />
          <div className="flex gap-2">
            <Button onClick={() => handleCopy(allLinks, 'Todos os permalinks copiados!')}><Copy /> Copiar Todos</Button>
            <Button variant="secondary" onClick={() => handleDownload(allLinks, 'permalinks_todos.txt')}><Download /> Baixar Todos</Button>
          </div>
        </div>
        <div className="space-y-4">
          <Label>Copiar por Intervalo</Label>
          <div className="flex items-center gap-4">
            <div className='flex-1'>
              <Label htmlFor="start-line">De</Label>
              <Input id="start-line" type="number" min={1} max={total} value={startLine} onChange={(e) => setStartLine(Math.max(1, parseInt(e.target.value)))} />
            </div>
            <div className='flex-1'>
              <Label htmlFor="end-line">Até</Label>
              <Input id="end-line" type="number" min={1} max={total} value={endLine} onChange={(e) => setEndLine(Math.min(total, parseInt(e.target.value)))} />
            </div>
          </div>
          <Textarea value={sliceLinks} readOnly rows={5} />
           <div className="flex gap-2">
            <Button onClick={() => handleCopy(sliceLinks, `Permalinks de ${startLine} a ${endLine} copiados!`)}><Copy /> Copiar Intervalo</Button>
            <Button variant="secondary" onClick={() => handleDownload(sliceLinks, `permalinks_${startLine}-${endLine}.txt`)}><Download /> Baixar Intervalo</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}