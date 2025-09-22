"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, Download } from "lucide-react";
import type { Offer } from "@/lib/types";

type PermalinkToolsProps = {
  offers: Offer[];
};

export default function PermalinkTools({ offers }: PermalinkToolsProps) {
  const { toast } = useToast();
  const total = offers.length;

  // estado inicial
  const [startLine, setStartLine] = useState(1);
  const [endLine, setEndLine] = useState(total || 1);

  // 🔧 sincronia com novas raspagens
  useEffect(() => {
    // opção A: sempre resetar para 1..total (mais previsível)
    setStartLine(1);
    setEndLine(total || 1);

    // Se preferir preservar o que for possível, troque pelo bloco abaixo:
    // setStartLine((prev) => Math.max(1, Math.min(prev, total || 1)));
    // setEndLine((prev) => Math.max(1, Math.min(prev, total || 1)));
  }, [total]);

  // util seguro p/ números
  const toInt = (v: string, fallback: number) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  };

  // clamp final (garante 1 ≤ start ≤ end ≤ total)
  const clampedStart = Math.max(1, Math.min(startLine, Math.max(total, 1)));
  const clampedEnd = Math.max(clampedStart, Math.min(endLine, Math.max(total, 1)));

  const allLinks = useMemo(
    () => offers.map((o) => o.permalink).join("\n"),
    [offers]
  );
  const sliceLinks = useMemo(
    () => offers.slice(clampedStart - 1, clampedEnd).map((o) => o.permalink).join("\n"),
    [offers, clampedStart, clampedEnd]
  );

  const handleCopy = (text: string, message: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast({ title: "Sucesso", description: message }))
      .catch(() =>
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Falha ao copiar para a área de transferência.",
        })
      );
  };

  const handleDownload = (text: string, filename: string) => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const disabled = total === 0;

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
            <Button
              onClick={() => handleCopy(allLinks, "Todos os permalinks copiados!")}
              disabled={disabled}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copiar Todos
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleDownload(allLinks, "permalinks_todos.txt")}
              disabled={disabled}
            >
              <Download className="mr-2 h-4 w-4" />
              Baixar Todos
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Label>Copiar por Intervalo</Label>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="start-line">De</Label>
              <Input
                id="start-line"
                type="number"
                min={1}
                max={total || 1}
                value={clampedStart}
                onChange={(e) => setStartLine(toInt(e.target.value, 1))}
                disabled={disabled}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="end-line">Até</Label>
              <Input
                id="end-line"
                type="number"
                min={1}
                max={total || 1}
                value={clampedEnd}
                onChange={(e) => setEndLine(toInt(e.target.value, total || 1))}
                disabled={disabled}
              />
            </div>
          </div>

          <Textarea value={sliceLinks} readOnly rows={5} />

          <div className="flex gap-2">
            <Button
              onClick={() =>
                handleCopy(sliceLinks, `Permalinks de ${clampedStart} a ${clampedEnd} copiados!`)
              }
              disabled={disabled}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copiar Intervalo
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleDownload(sliceLinks, `permalinks_${clampedStart}-${clampedEnd}.txt`)}
              disabled={disabled}
            >
              <Download className="mr-2 h-4 w-4" />
              Baixar Intervalo
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
