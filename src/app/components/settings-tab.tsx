
"use client";

import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, Trash2 } from 'lucide-react';
import type { AppSettings, WhapiGroup } from '@/lib/types';
import { getWhapiGroupsAction } from '@/app/actions/whatsapp';
import { generateMeliAuthUrlAction } from '@/app/auth/actions';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';

type SettingsTabProps = {
  appSettings: AppSettings;
  setAppSettings: (config: AppSettings) => void;
};

export default function SettingsTab({ appSettings, setAppSettings }: SettingsTabProps) {
  const { toast } = useToast();
  const [localConfig, setLocalConfig] = useState(appSettings);
  const [isFetching, startFetchingTransition] = useTransition();
  const [isAuthPending, startAuthTransition] = useTransition();
  const [allGroups, setAllGroups] = useState<WhapiGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLocalConfig(prev => ({
      ...prev,
      [name]: value,
    }));
  };
  
   const handleNumericInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalConfig(prev => ({
      ...prev,
      [name]: parseInt(value, 10) || 0,
    }));
  };

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppSettings(localConfig);
    toast({
      title: "Configurações Salvas",
      description: "Suas configurações foram atualizadas.",
    });
  };

  const handleFetchGroups = () => {
    if (!localConfig.whapiToken) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Por favor, insira o Token da API Whapi.' });
        return;
    }
    startFetchingTransition(async () => {
        const result = await getWhapiGroupsAction(localConfig.whapiToken);
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
        ? [...prev.whapiSelectedGroups, group]
        : prev.whapiSelectedGroups.filter(g => g.id !== group.id);
      return { ...prev, whapiSelectedGroups: selectedGroups };
    });
  };
  
  const handleManualGroups = (manualGroupsText: string) => {
    const groups: WhapiGroup[] = manualGroupsText.split(',')
        .map(name => name.trim())
        .filter(name => name)
        .map(name => ({ id: `manual-${name}`, name }));
    setLocalConfig(prev => ({...prev, whapiSelectedGroups: [...prev.whapiSelectedGroups, ...groups]}));
  };

  const filteredGroups = allGroups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleMeliAuth = () => {
    startAuthTransition(async () => {
        if (!localConfig.meliAppId || !localConfig.meliClientSecret) {
          toast({ variant: 'destructive', title: 'Erro', description: 'Por favor, preencha o App ID e o Client Secret do Mercado Livre.' });
          return;
        }
        
        sessionStorage.setItem('meli_app_id', localConfig.meliAppId);
        sessionStorage.setItem('meli_client_secret', localConfig.meliClientSecret);

        const result = await generateMeliAuthUrlAction(localConfig.meliAppId);

        if (result.success && result.authUrl) {
            window.open(result.authUrl, '_blank');
        } else {
            toast({ variant: 'destructive', title: 'Erro de Autenticação', description: result.error || 'Não foi possível gerar a URL de autenticação.' });
        }
    });
  };


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
                <CardTitle>🚀 Integração com Mercado Livre</CardTitle>
                <CardDescription>Configure suas credenciais de afiliado do Mercado Livre.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="meliAppId">App ID</Label>
                    <Input
                        id="meliAppId"
                        name="meliAppId"
                        value={localConfig.meliAppId}
                        onChange={handleInputChange}
                        placeholder="Seu App ID do Mercado Livre"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="meliClientSecret">Client Secret</Label>
                    <Input
                        id="meliClientSecret"
                        name="meliClientSecret"
                        type="password"
                        value={localConfig.meliClientSecret}
                        onChange={handleInputChange}
                        placeholder="Seu Client Secret do Mercado Livre"
                    />
                </div>
                <Button type="button" onClick={handleMeliAuth} disabled={isAuthPending} className="w-full">
                    {isAuthPending ? <Loader2 className="animate-spin" /> : 'Autenticar com Mercado Livre'}
                </Button>
            </CardContent>
          </Card>
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
                  name="whapiToken"
                  type="password"
                  value={localConfig.whapiToken}
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

                      <Label>{localConfig.whapiSelectedGroups.length} selecionado(s)</Label>
                      <ScrollArea className="h-40 rounded-md border p-2">
                          {filteredGroups.length > 0 ? (
                            filteredGroups.map(group => (
                                <div key={group.id} className="flex items-center space-x-2 p-1">
                                    <Checkbox 
                                        id={group.id} 
                                        checked={localConfig.whapiSelectedGroups.some(g => g.id === group.id)}
                                        onCheckedChange={(checked) => handleGroupSelection(group, !!checked)}
                                    />
                                    <Label htmlFor={group.id} className="font-normal">{group.name}</Label>
                                </div>
                            ))
                          ) : (
                             allGroups.length > 0 ? (
                                allGroups.map(group => (
                                <div key={group.id} className="flex items-center space-x-2 p-1">
                                    <Checkbox 
                                        id={group.id} 
                                        checked={localConfig.whapiSelectedGroups.some(g => g.id === group.id)}
                                        onCheckedChange={(checked) => handleGroupSelection(group, !!checked)}
                                    />
                                    <Label htmlFor={group.id} className="font-normal">{group.name}</Label>
                                </div>
                                ))
                             ) : (
                                <p className="text-sm text-muted-foreground p-2">
                                    Nenhum grupo. Clique em "Carregar grupos da API".
                                </p>
                             )
                          )}
                      </ScrollArea>
                      <Button type="button" variant="outline" onClick={() => { setLocalConfig(p => ({...p, whapiSelectedGroups: []})); setAllGroups([]); setSearchTerm(''); }} className="w-full">
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
                        <Input id="whapiInterval" name="whapiInterval" type="number" value={localConfig.whapiInterval} onChange={handleNumericInputChange} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Limite de envios</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Input id="whapiSendLimit" name="whapiSendLimit" type="number" value={localConfig.whapiSendLimit} onChange={handleNumericInputChange} />
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
