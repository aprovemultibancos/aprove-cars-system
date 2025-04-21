import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAsaas, CreateCustomerParams } from "@/hooks/use-asaas";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Schema para validação do formulário de cliente
const customerFormSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  cpfCnpj: z.string()
    .min(11, "CPF deve ter 11 dígitos")
    .max(14, "CNPJ deve ter 14 dígitos")
    .refine(val => /^\d+$/.test(val), "Apenas números são permitidos"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  mobilePhone: z.string().optional().or(z.literal("")),
  postalCode: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  addressNumber: z.string().optional().or(z.literal("")),
  complement: z.string().optional().or(z.literal("")),
  province: z.string().optional().or(z.literal(""))
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

export function NewCustomerForm({ onSuccess }: { onSuccess?: () => void }) {
  const { createCustomerMutation } = useAsaas();
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      cpfCnpj: "",
      email: "",
      phone: "",
      mobilePhone: "",
      postalCode: "",
      address: "",
      addressNumber: "",
      complement: "",
      province: ""
    }
  });
  
  // Função para buscar e preencher endereço pelo CEP
  const fetchAddressByCep = async (cep: string) => {
    // Remover qualquer caractere não-numérico do CEP
    const cleanCep = cep.replace(/\D/g, '');
    
    // Verificar se o CEP tem 8 dígitos
    if (cleanCep.length !== 8) return;
    
    try {
      setLoadingCep(true);
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP informado e tente novamente.",
          variant: "destructive"
        });
        return;
      }
      
      // Preencher os campos do formulário com os dados retornados
      form.setValue('address', data.logradouro || '');
      form.setValue('province', data.bairro || '');
      form.setValue('complement', data.complemento || '');
      
      toast({
        title: "Endereço encontrado",
        description: "Os campos de endereço foram preenchidos automaticamente.",
        variant: "default"
      });
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast({
        title: "Erro ao buscar CEP",
        description: "Não foi possível consultar o CEP. Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setLoadingCep(false);
    }
  };
  
  // Monitorar alterações no campo CEP
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'postalCode') {
        const postalCode = value.postalCode as string;
        if (postalCode && postalCode.replace(/\D/g, '').length === 8) {
          fetchAddressByCep(postalCode);
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch]);
  
  const onSubmit = async (data: CustomerFormValues) => {
    const customerData: CreateCustomerParams = {
      ...data
    };
    
    createCustomerMutation.mutate(customerData, {
      onSuccess: (response) => {
        // Verificar se está em modo de demonstração
        if (response.id.startsWith('demo_')) {
          setIsDemoMode(true);
        }
        
        // Resetar formulário
        form.reset();
        
        // Notificar componente pai sobre sucesso
        if (onSuccess) onSuccess();
      }
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cadastrar Novo Cliente</CardTitle>
        <CardDescription>Adicione um novo cliente ao Asaas para gerar cobranças</CardDescription>
      </CardHeader>
      <CardContent>
        {isDemoMode && (
          <Alert className="mb-4 border-amber-300 bg-amber-50 text-amber-800">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Modo de demonstração</AlertTitle>
            <AlertDescription className="text-xs">
              O cliente foi salvo apenas localmente. Para salvar no Asaas, configure uma chave de API válida.
            </AlertDescription>
          </Alert>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo*</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do cliente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="cpfCnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF/CNPJ*</FormLabel>
                    <FormControl>
                      <Input placeholder="Apenas números" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Email do cliente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 0000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Separator className="my-4" />
            <h3 className="text-sm font-medium mb-2">Endereço (opcional)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <div className="relative w-full">
                          <Input placeholder="00000-000" {...field} />
                          {loadingCep && (
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon"
                          disabled={loadingCep || !field.value || field.value.replace(/\D/g, '').length !== 8}
                          onClick={() => fetchAddressByCep(field.value)}
                        >
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                    {!loadingCep && field.value && field.value.replace(/\D/g, '').length === 8 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Clique na lupa para buscar o endereço
                      </p>
                    )}
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Logradouro</FormLabel>
                    <FormControl>
                      <Input placeholder="Rua, Avenida, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="addressNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input placeholder="123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="complement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complemento</FormLabel>
                    <FormControl>
                      <Input placeholder="Apto, Bloco, etc" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="province"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro</FormLabel>
                    <FormControl>
                      <Input placeholder="Bairro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={createCustomerMutation.isPending}
              >
                {createCustomerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cadastrando...
                  </>
                ) : "Cadastrar Cliente"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}