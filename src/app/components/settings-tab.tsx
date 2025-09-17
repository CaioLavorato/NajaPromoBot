
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';

type SettingsTabProps = {
  whapiConfig: { groupId: string; token: string };
  setWhapiConfig: (config: { groupId: string; token: string }) => void;
};

export default function SettingsTab({ whapiConfig, setWhapiConfig }: SettingsTabProps) {
  const { toast } = useToast();

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newConfig = {
      groupId: formData.get('whapiGroupId') as string,
      token: formData.get('whapiToken') as string,
    };
    setWhapiConfig(newConfig);
    toast({
      title: "Configurações Salvas",
      description: "Sua configuração do Whapi foi atualizada.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações</CardTitle>
        <CardDescription>
          Gerencie suas configurações de integração aqui.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>📱 Integração com WhatsApp</CardTitle>
              <CardDescription>Configure suas credenciais da API Whapi.cloud.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="whapiGroupId">Whapi Group ID</Label>
                <Input
                  id="whapiGroupId"
                  name="whapiGroupId"
                  defaultValue={whapiConfig.groupId}
                  placeholder="1234567890@g.us"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whapiToken">Whapi Token</Label>
                <Input
                  id="whapiToken"
                  name="whapiToken"
                  type="password"
                  defaultValue={whapiConfig.token}
                  placeholder="Seu token da API Whapi"
                />
              </div>
            </CardContent>
          </Card>
          <Button type="submit" className="w-full">
            <Save className="mr-2 h-4 w-4" />
            Salvar Configurações
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
