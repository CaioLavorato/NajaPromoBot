"use client";

import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, Search, Trash2 } from 'lucide-react';
import type { WhapiConfig, WhapiGroup } from '@/lib/types';
import { getWhapiGroupsAction } from '@/app/actions/whatsapp';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';

type SettingsTabProps = {
  whapiConfig: WhapiConfig;
  setWhapiConfig: (config: WhapiConfig) => void;
};

export default function SettingsTab({ whapiConfig, setWhapiConfig }: SettingsTabProps) {
  const { toast } = useToast();
  const [localConfig, setLocalConfig] = useState(whapiConfig);
  const [isFetching, startFetchingTransition] = useTransition();
  const [allGroups, setAllGroups] = useState<WhapiGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setLocalConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) : value,
    }));
  };

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWhapiConfig(localConfig);
    toast({
      title: "Configurações Salvas",
      description: "Sua configuração do Whapi foi atualizada.",
    });
  };

  const handleFetchGroups = () => {
    if (!localConfig.token) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Por favor, insira o Token da API Whapi.' });
        return;
    }
    startFetchingTransition(async () => {
        const result = await getWhapiGroupsAction(localConfig.token);
        if (result.success && result.data) {
            setAllGroups(result.data);
            toast({ title: 'Sucesso', description: `${result.data.length} grupos carregados.`});
        } else {
            toast({ variant: 'destructive', title: 'Erro', description: result.message });
        }
    });
  };
  
  const handleGroupSelection = (group: WhapiGroup, isSelected: boolean) => {
    setLocalConfig(prev => {
      const selectedGroups = isSelected
        ? [...prev.selectedGroups, group]
        : prev.selectedGroups.filter(g => g.id !== group.id);
      return { ...prev, selectedGroups };
    });
  };
  
  const handleManualGroups = (manualGroupsText: string) => {
    const groups: WhapiGroup[] = manualGroupsText.split(',')
        .map(name => name.trim())
        .filter(name => name)
        .map(name => ({ id: `manual-${name}`, name }));
    setLocalConfig(prev => ({...prev, selectedGroups: [...prev.selectedGroups, ...groups]}));
  };

  const filteredGroups = allGroups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()));


  return (
    <form onSubmit={handleSave} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações Gerais</CardTitle>
          <CardDescription>
            Gerencie suas configurações de integração e envio aqui.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>📱 Integração com WhatsApp</CardTitle>
              <CardDescription>Configure suas credenciais da API Whapi.cloud.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="whapiToken">Whapi Token</Label>
                <Input
                  id="whapiToken"
                  name="token"
                  type="password"
                  value={localConfig.token}
                  onChange={handleInputChange}
                  placeholder="Seu token da API Whapi"
                />
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1">
                  <CardHeader>
                      <CardTitle>Gerenciamento de Grupos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <div className="space-y-2">
                          <Label htmlFor="manualGroups">Grupos (separados por vírgula)</Label>
                          <Textarea id="manualGroups" placeholder="Promoções, Achados" onBlur={(e) => handleManualGroups(e.target.value)} />
                      </div>
                      <Button type="button" onClick={handleFetchGroups} disabled={isFetching} className="w-full">
                          {isFetching ? <Loader2 className="animate-spin"/> : 'Carregar grupos da API'}
                      </Button>
                      <div className="space-y-2">
                          <Input placeholder="Buscar grupo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
                      </div>

                      <Label>{localConfig.selectedGroups.length} selecionado(s)</Label>
                      <ScrollArea className="h-40 rounded-md border p-2">
                          {filteredGroups.length > 0 ? (
                            filteredGroups.map(group => (
                                <div key={group.id} className="flex items-center space-x-2 p-1">
                                    <Checkbox 
                                        id={group.id} 
                                        checked={localConfig.selectedGroups.some(g => g.id === group.id)}
                                        onCheckedChange={(checked) => handleGroupSelection(group, !!checked)}
                                    />
                                    <Label htmlFor={group.id} className="font-normal">{group.name}</Label>
                                </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground p-2">
                                Nenhum grupo. Clique em "Carregar grupos da API".
                            </p>
                          )}
                      </ScrollArea>
                      <Button type="button" variant="outline" onClick={() => { setLocalConfig(p => ({...p, selectedGroups: []})); setAllGroups([]); setSearchTerm(''); }} className="w-full">
                          <Trash2 className="mr-2 h-4 w-4"/> Limpar
                      </Button>
                  </CardContent>
              </Card>

              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Intervalo (segundos)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Input id="interval" name="interval" type="number" value={localConfig.interval} onChange={handleInputChange} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Limite de envios</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Input id="sendLimit" name="sendLimit" type="number" value={localConfig.sendLimit} onChange={handleInputChange} />
                    </CardContent>
                </Card>
              </div>
          </div>
        </CardContent>
      </Card>
      <Button type="submit" className="w-full">
        <Save className="mr-2 h-4 w-4" />
        Salvar Configurações
      </Button>
    </form>
  );
}
