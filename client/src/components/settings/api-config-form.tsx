import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useConfigureAsaasApi } from "@/hooks/use-asaas";

export function ApiConfigForm() {
  const [apiKey, setApiKey] = useState("");
  const configMutation = useConfigureAsaasApi();
  const [showKey, setShowKey] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey) {
      configMutation.mutate({ apiKey });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Configuração da API Asaas</CardTitle>
        <CardDescription>
          Configure sua chave de API do Asaas para ativar pagamentos reais
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4 border-blue-300 bg-blue-50 text-blue-800">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Informação</AlertTitle>
          <AlertDescription className="text-xs">
            A chave de API é necessária para processar pagamentos reais. Você pode obter sua chave no painel do Asaas.
            Se não configurada, o sistema funcionará em modo de demonstração com dados simulados.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">Chave da API Asaas</Label>
            <div className="flex">
              <Input
                id="apiKey"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                type={showKey ? "text" : "password"}
                placeholder="$aact_YourApiKeyHere"
                required
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                className="ml-2"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? "Ocultar" : "Mostrar"}
              </Button>
            </div>
          </div>

          {configMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>
                {configMutation.error.message || "Falha ao configurar a API. Verifique a chave e tente novamente."}
              </AlertDescription>
            </Alert>
          )}

          {configMutation.isSuccess && (
            <Alert className="border-green-300 bg-green-50 text-green-800">
              <KeyRound className="h-4 w-4" />
              <AlertTitle>Sucesso</AlertTitle>
              <AlertDescription>
                API configurada com sucesso! O sistema agora utilizará dados reais do Asaas.
              </AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={configMutation.isPending || !apiKey}
          >
            {configMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Configurando...
              </>
            ) : (
              "Salvar configuração"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          Sua chave é armazenada apenas no servidor e nunca é compartilhada.
        </div>
      </CardFooter>
    </Card>
  );
}