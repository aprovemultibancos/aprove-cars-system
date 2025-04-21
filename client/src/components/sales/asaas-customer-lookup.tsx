import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatCpfCnpj, isValidCPF, isValidCNPJ } from "@/lib/utils";
import { Search, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Schema para validação do formulário
const lookupSchema = z.object({
  cpfCnpj: z.string()
    .min(11, "CPF/CNPJ inválido")
    .refine((val) => {
      const cleanVal = val.replace(/\D/g, '');
      return cleanVal.length === 11 || cleanVal.length === 14;
    }, "CPF ou CNPJ deve ter 11 ou 14 dígitos")
    .refine((val) => {
      const cleanVal = val.replace(/\D/g, '');
      return cleanVal.length === 11 ? isValidCPF(cleanVal) : isValidCNPJ(cleanVal);
    }, "CPF/CNPJ inválido")
});

// Interface para os parâmetros do componente
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

// Interface para a resposta do cliente
interface AsaasCustomerResponse {
  id: string;
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
  deleted: boolean;
}

// Componente principal
export function AsaasCustomerLookup({ onCustomerSelect }: AsaasCustomerLookupProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [customer, setCustomer] = useState<AsaasCustomerResponse | null>(null);
  const { toast } = useToast();

  // Configurar o formulário
  const form = useForm<z.infer<typeof lookupSchema>>({
    resolver: zodResolver(lookupSchema),
    defaultValues: {
      cpfCnpj: "",
    },
  });

  // Função para buscar cliente por CPF/CNPJ
  async function searchCustomer(cpfCnpj: string) {
    try {
      setIsLoading(true);
      
      // Limpar caracteres não numéricos
      const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '');
      
      // Fazer requisição para a API
      const response = await apiRequest("GET", `/api/asaas/customers?cpfCnpj=${cleanCpfCnpj}`);
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        const foundCustomer = data.data[0];
        setCustomer(foundCustomer);
      } else {
        setCustomer(null);
        toast({
          title: "Cliente não encontrado",
          description: "Nenhum cliente encontrado com este CPF/CNPJ.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao buscar cliente:", error);
      toast({
        title: "Erro ao buscar cliente",
        description: "Ocorreu um erro ao buscar o cliente. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Handler para o submit do formulário
  function onSubmit(values: z.infer<typeof lookupSchema>) {
    searchCustomer(values.cpfCnpj);
  }

  // Handler para selecionar um cliente
  function handleSelectCustomer() {
    if (customer) {
      onCustomerSelect({
        id: customer.id,
        name: customer.name,
        cpfCnpj: customer.cpfCnpj,
        email: customer.email,
        phone: customer.phone || customer.mobilePhone,
        address: customer.address
      });
      
      // Limpar formulário e cliente após selecionar
      form.reset();
      setCustomer(null);
      
      toast({
        title: "Cliente selecionado",
        description: "Cliente do Asaas selecionado com sucesso.",
      });
    }
  }

  return (
    <Card className="border-green-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-md font-medium">Buscar cliente no Asaas</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cpfCnpj"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF/CNPJ</FormLabel>
                  <div className="flex space-x-2">
                    <FormControl>
                      <Input 
                        placeholder="Digite o CPF ou CNPJ" 
                        {...field} 
                        onChange={(e) => {
                          // Aplicar formatação enquanto digita
                          field.onChange(formatCpfCnpj(e.target.value));
                        }}
                        className="flex-1"
                      />
                    </FormControl>
                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      size="sm"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        {customer && (
          <div className="mt-4 p-3 bg-green-50 rounded-md border border-green-200">
            <h3 className="font-medium text-sm">Cliente encontrado:</h3>
            <div className="mt-1 text-sm">
              <p className="font-medium">{customer.name}</p>
              <p>{formatCpfCnpj(customer.cpfCnpj)}</p>
              {customer.email && <p>{customer.email}</p>}
              {(customer.phone || customer.mobilePhone) && (
                <p>{customer.phone || customer.mobilePhone}</p>
              )}
              <Button 
                className="mt-2 w-full" 
                size="sm"
                onClick={handleSelectCustomer}
              >
                Selecionar este cliente
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}