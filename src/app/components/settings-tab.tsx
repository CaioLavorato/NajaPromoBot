
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
        const result = await generateMeliAuthUrlAction();

        if (result.success && result.authUrl) {
            window.open(result.authUrl, '_blank');
        } else {
            toast({ variant: 'destructive', title: 'Erro de Autenticação', description: result.error || 'Não foi possível gerar la URL de autenticação.' });
        }
    });
  };


  return (
    <form onSubmit={handleSave} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações Gerais</CardTitle>
          <CardDescription>
            Gerencie suas configurações de integração e envio aqui. As credenciais do Mercado Livre são gerenciadas por variáveis de ambiente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Feed de Produtos Awin</CardTitle>
                    <CardDescription>Credenciais para acessar os feeds de produtos da Awin.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="awinApiKey">Awin API Key</Label>
                        <Input id="awinApiKey" name="awinApiKey" value={localConfig.awinApiKey} onChange={handleInputChange} placeholder="Sua chave de API da Awin" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="awinAdvertiserIds">Awin Advertiser IDs (separados por vírgula)</Label>
                        <Input id="awinAdvertiserIds" name="awinAdvertiserIds" value={localConfig.awinAdvertiserIds} onChange={handleInputChange} placeholder="Ex: 12345,67890" />
                    </div>
                </CardContent>
            </Card>
            <Card>
              <CardHeader>
                  <CardTitle>🛍️ Integração com Shopee</CardTitle>
                  <CardDescription>Configure suas credenciais da API de Afiliados da Shopee.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="space-y-2">
                      <Label htmlFor="shopeeAppId">Shopee App ID</Label>
                      <Input id="shopeeAppId" name="shopeeAppId" value={localConfig.shopeeAppId} onChange={handleInputChange} placeholder="Seu App ID da Shopee" />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="shopeeAppKey">Shopee App Key</Label>
                      <Input id="shopeeAppKey" name="shopeeAppKey" type="password" value={localConfig.shopeeAppKey} onChange={handleInputChange} placeholder="Sua App Key da Shopee" />
                  </div>
              </CardContent>
            </Card>
           <Card>
              <CardHeader>
                  <CardTitle>🛒 Integração com Amazon</CardTitle>
                  <CardDescription>Configure suas credenciais da Product Advertising API.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="space-y-2">
                      <Label htmlFor="amazonPartnerTag">Partner Tag (ID de Associado)</Label>
                      <Input id="amazonPartnerTag" name="amazonPartnerTag" value={localConfig.amazonPartnerTag} onChange={handleInputChange} placeholder="seusite-20" />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="amazonAccessKey">Access Key</Label>
                      <Input id="amazonAccessKey" name="amazonAccessKey" value={localConfig.amazonAccessKey} onChange={handleInputChange} placeholder="AKIA..." />
                  </div>
                   <div className="space-y-2">
                      <Label htmlFor="amazonSecretKey">Secret Key</Label>
                      <Input id="amazonSecretKey" name="amazonSecretKey" type="password" value={localConfig.amazonSecretKey} onChange={handleInputChange} placeholder="Sua chave secreta" />
                  </div>
              </CardContent>
            </Card>
          <Card>
            <CardHeader>
                <CardTitle>🚀 Integração com Mercado Livre</CardTitle>
                <CardDescription>Use o botão abaixo para autenticar sua conta com o Mercado Livre. As credenciais (Client ID, Secret e a URL pública) devem ser configuradas no arquivo .env.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button type="button" onClick={handleMeliAuth} disabled={isAuthPending} className="w-full">
                    {isAuthPending ? <Loader2 className="animate-spin" /> : 'Autenticar com Mercado Livre'}
                </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>📱 Integração com WhatsApp</CardTitle>
              <CardDescription>Configure suas credenciais da API Whapi.cloud e parâmetros de envio.</CardDescription>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="whapiInterval">Intervalo (segundos)</Label>
                        <Input id="whapiInterval" name="whapiInterval" type="number" value={localConfig.whapiInterval} onChange={handleNumericInputChange} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="whapiSendLimit">Limite de envios</Label>
                        <Input id="whapiSendLimit" name="whapiSendLimit" type="number" value={localConfig.whapiSendLimit} onChange={handleNumericInputChange} />
                    </div>
                </div>
            </CardContent>
          </Card>
          
          <Card>
              <CardHeader>
                  <CardTitle>Gerenciamento de Grupos do WhatsApp</CardTitle>
                  <CardDescription>Carregue grupos da API ou adicione manualmente os IDs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="space-y-2">
                      <Label htmlFor="manualGroups">Adicionar Grupos por ID (separados por vírgula)</Label>
                      <Textarea id="manualGroups" placeholder="1234567890@g.us,0987654321@g.us" onBlur={(e) => handleManualGroups(e.target.value)} />
                  </div>
                  <Button type="button" onClick={handleFetchGroups} disabled={isFetching} className="w-full">
                      {isFetching ? <Loader2 className="animate-spin"/> : 'Carregar grupos da API'}
                  </Button>
                  <div className="space-y-2">
                      <Label>Grupos Selecionados ({localConfig.whapiSelectedGroups.length})</Label>
                      <Input placeholder="Buscar grupo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
                  </div>

                  <ScrollArea className="h-40 rounded-md border p-2">
                      {filteredGroups.length > 0 ? (
                        filteredGroups.map(group => (
                            <div key={group.id} className="flex items-center space-x-2 p-1">
                                <Checkbox 
                                    id={group.id} 
                                    checked={localConfig.whapiSelectedGroups.some(g => g.id === group.id)}
                                    onCheckedChange={(checked) => handleGroupSelection(group, !!checked)}
                                />
                                <Label htmlFor={group.id} className="font-normal">{group.name} ({group.id})</Label>
                            </div>
                        ))
                      ) : (
                         <p className="text-sm text-muted-foreground p-2">
                             Nenhum grupo carregado. Clique em "Carregar grupos da API" ou adicione manualmente.
                         </p>
                      )}
                  </ScrollArea>
                   <ScrollArea className="h-24 rounded-md border p-2 mt-2">
                      {localConfig.whapiSelectedGroups.map(g => (
                          <div key={g.id} className="flex items-center justify-between p-1 text-sm">
                              <span>{g.name}</span>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleGroupSelection(g, false)}>
                                  <Trash2 className="h-4 w-4"/>
                              </Button>
                          </div>
                      ))}
                    </ScrollArea>

                  <Button type="button" variant="outline" onClick={() => { setLocalConfig(p => ({...p, whapiSelectedGroups: []})); setAllGroups([]); setSearchTerm(''); }} className="w-full">
                      <Trash2 className="mr-2 h-4 w-4"/> Limpar Seleção
                  </Button>
              </CardContent>
          </Card>
        </CardContent>
      </Card>
      <Button type="submit" className="w-full">
        <Save className="mr-2 h-4 w-4" />
        Salvar Configurações
      </Button>
    </form>
  );
}
