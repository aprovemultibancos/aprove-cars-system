import { useState } from "react";
import useAsaas from "@/hooks/use-asaas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { formatCpfCnpj } from "@/lib/utils";

interface AsaasCustomerLookupProps {
  onCustomerSelect: (customer: {
    id: string;
    name: string;
    cpfCnpj: string;
    email?: string;
    phone?: string;
    address?: string;
  }) => void;
}

export function AsaasCustomerLookup({ onCustomerSelect }: AsaasCustomerLookupProps) {
  const { toast } = useToast();
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
  // Usar o hook para buscar o cliente pelo CPF/CNPJ
  const { useFindCustomerByCpfCnpj } = useAsaas();
  
  // Remover caracteres não-numéricos do CPF/CNPJ
  const formatCpfCnpjForSearch = (value: string) => {
    return value.replace(/[^\d]/g, "");
  };
  
  const handleSearch = async () => {
    const formattedCpfCnpj = formatCpfCnpjForSearch(cpfCnpj);
    
    if (formattedCpfCnpj.length < 11) {
      toast({
        title: "CPF/CNPJ inválido",
        description: "Digite um CPF ou CNPJ válido para pesquisar",
        variant: "destructive"
      });
      return;
    }
    
    setIsSearching(true);
    
    try {
      // Buscar cliente diretamente via API
      const response = await fetch(`/api/asaas/customers?cpfCnpj=${formattedCpfCnpj}`);
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        const customer = data.data[0];
        toast({
          title: "Cliente encontrado",
          description: `Cliente ${customer.name} encontrado no Asaas`,
          variant: "default"
        });
        onCustomerSelect({
          id: customer.id,
          name: customer.name,
          cpfCnpj: customer.cpfCnpj,
          email: customer.email,
          phone: customer.phone || customer.mobilePhone,
          address: customer.address
        });
      } else {
        toast({
          title: "Cliente não encontrado",
          description: "Nenhum cliente encontrado com este CPF/CNPJ no Asaas",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Erro ao buscar cliente:", error);
      toast({
        title: "Erro na busca",
        description: "Ocorreu um erro ao buscar o cliente no Asaas. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg">Buscar Cliente no Asaas</CardTitle>
        <CardDescription>
          Digite o CPF/CNPJ para buscar um cliente já cadastrado no Asaas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <Input
            placeholder="CPF ou CNPJ"
            value={cpfCnpj}
            onChange={(e) => setCpfCnpj(e.target.value)}
            className="flex-1"
          />
          <Button 
            onClick={handleSearch} 
            disabled={isSearching}
            type="button"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Buscar
          </Button>
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Ao encontrar um cliente já cadastrado, seus dados serão automaticamente preenchidos
      </CardFooter>
    </Card>
  );
}