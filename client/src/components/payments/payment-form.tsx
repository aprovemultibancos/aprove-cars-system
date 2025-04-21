import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon, Search, User, AlertCircle, CreditCard, Receipt, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn, formatCurrency, formatCpfCnpj } from "@/lib/utils";
import { Customer, Sale } from "@shared/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AsaasCustomerLookup } from "../sales/asaas-customer-lookup";

// Definir o schema do formulário de pagamento
const paymentFormSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  description: z.string().min(1, "Descrição é obrigatória"),
  value: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  dueDate: z.date({
    required_error: "Data de vencimento é obrigatória",
  }),
  billingType: z.enum(["BOLETO", "PIX", "CREDIT_CARD"], {
    required_error: "Forma de pagamento é obrigatória",
  }),
  relatedSaleId: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface PaymentFormProps {
  customers: Customer[];
  sales: Sale[];
}

export function PaymentForm({ customers, sales }: PaymentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [originalValue, setOriginalValue] = useState<number>(0);
  const [finalValue, setFinalValue] = useState<number>(0);
  const [showAsaasLookup, setShowAsaasLookup] = useState<boolean>(false);
  const [selectedAsaasCustomer, setSelectedAsaasCustomer] = useState<{
    id: string;
    name: string;
    cpfCnpj: string;
    email?: string;
    phone?: string;
  } | null>(null);
  
  // Consulta para obter clientes do Asaas
  const { data: asaasCustomers, isLoading: asaasCustomersLoading } = useQuery({
    queryKey: ['/api/asaas/customers'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/asaas/customers?limit=100');
        const data = await response.json();
        return data.data || [];
      } catch (error) {
        console.error("Erro ao buscar clientes do Asaas:", error);
        return [];
      }
    },
  });
  
  // Definir valores padrão para o formulário
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      customerId: "",
      customerName: "",
      description: "",
      value: 0,
      dueDate: new Date(),
      billingType: "BOLETO",
      notes: "",
    },
  });
  
  // Acompanhar taxa do pagamento - 2.49% para boleto e PIX
  const watchBillingType = form.watch("billingType");
  const watchValue = form.watch("value");
  
  // Atualizar valores quando mudar o tipo de pagamento ou valor
  useEffect(() => {
    setOriginalValue(watchValue || 0);
    
    // Taxa de 2.49% para qualquer método de pagamento
    const fee = 0.0249; // 2.49%
    const calculatedValue = (watchValue || 0) * (1 + fee);
    setFinalValue(calculatedValue);
    
  }, [watchBillingType, watchValue]);
  
  // Quando o modo de pagamento mudar
  const handleBillingTypeChange = (type: string) => {
    form.setValue("billingType", type as "BOLETO" | "PIX" | "CREDIT_CARD");
    
    // Taxa de 2.49% para qualquer método de pagamento
    const fee = 0.0249; // 2.49%
    const calculatedValue = (watchValue || 0) * (1 + fee);
    setFinalValue(calculatedValue);
  };
  
  // Quando o valor mudar
  const handleValueChange = (value: string) => {
    const numValue = parseFloat(value);
    form.setValue("value", numValue);
    setOriginalValue(numValue);
    
    // Taxa de 2.49% para qualquer método de pagamento
    const fee = 0.0249; // 2.49%
    const calculatedValue = numValue * (1 + fee);
    setFinalValue(calculatedValue);
  };
  
  // Mutação para criar pagamento
  const mutation = useMutation({
    mutationFn: async (data: PaymentFormValues) => {
      // Criar o objeto de pagamento para a API do Asaas
      const paymentData = {
        customerId: selectedAsaasCustomer?.id, // Enviar o ID do cliente selecionado
        description: data.description,
        value: data.value,
        dueDate: format(data.dueDate, 'yyyy-MM-dd'),
        billingType: data.billingType,
        relatedSaleId: data.relatedSaleId !== "0" ? data.relatedSaleId : undefined,
        notes: data.notes
      };
      
      console.log("Enviando dados para API:", paymentData);
      return await apiRequest("POST", "/api/asaas/payments", paymentData);
    },
    onSuccess: () => {
      toast({
        title: "Cobrança criada",
        description: "A cobrança foi gerada com sucesso no Asaas",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/asaas/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      
      // Limpar o formulário e os dados do cliente selecionado
      form.reset();
      setSelectedAsaasCustomer(null);
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar cobrança",
        description: error.message || "Ocorreu um erro ao criar a cobrança no Asaas. Verifique se o cliente foi cadastrado corretamente.",
        variant: "destructive",
      });
    },
  });
  
  // Função para lidar com a seleção de cliente do Asaas
  const handleCustomerSelect = (customer: {
    id: string;
    name: string;
    cpfCnpj: string;
    email?: string;
    phone?: string;
  }) => {
    setSelectedAsaasCustomer(customer);
    setShowAsaasLookup(false);
    
    // Atualizar o formulário com os dados do cliente
    form.setValue("customerId", customer.id);
    form.setValue("customerName", customer.name);
    
    toast({
      title: "Cliente selecionado",
      description: `Cliente ${customer.name} selecionado para cobrança.`,
    });
  };
  
  function onSubmit(data: PaymentFormValues) {
    // Verificar se foi selecionado um cliente
    if (!selectedAsaasCustomer && !data.customerId) {
      toast({
        title: "Cliente não selecionado",
        description: "Por favor, selecione um cliente para a cobrança.",
        variant: "destructive"
      });
      return;
    }
    
    // Ajustar o valor para incluir a taxa de 2.49%
    data.value = finalValue;
    
    // Adicionar o ID do cliente Asaas se foi selecionado
    if (selectedAsaasCustomer) {
      data.customerId = selectedAsaasCustomer.id;
    }
    
    mutation.mutate(data);
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <input type="hidden" name="customerId" value={selectedAsaasCustomer?.id || ""} />
            
            {selectedAsaasCustomer ? (
              <div className="border rounded-md p-4 mb-4 bg-green-50">
                <h3 className="text-lg font-medium mb-2">Cliente Selecionado</h3>
                <div className="space-y-1">
                  <p className="font-semibold">{selectedAsaasCustomer.name}</p>
                  <p className="text-sm text-gray-600">{formatCpfCnpj(selectedAsaasCustomer.cpfCnpj)}</p>
                  {selectedAsaasCustomer.email && <p className="text-sm text-gray-600">{selectedAsaasCustomer.email}</p>}
                  {selectedAsaasCustomer.phone && <p className="text-sm text-gray-600">{selectedAsaasCustomer.phone}</p>}
                </div>
                <div className="mt-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedAsaasCustomer(null)}
                  >
                    Alterar Cliente
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Selecione um Cliente</h3>
                  <Button
                    type="button"
                    variant={showAsaasLookup ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowAsaasLookup(!showAsaasLookup)}
                  >
                    {showAsaasLookup ? "Fechar Busca" : "Buscar Cliente por CPF/CNPJ"}
                  </Button>
                </div>
                
                {showAsaasLookup ? (
                  <AsaasCustomerLookup onCustomerSelect={handleCustomerSelect} />
                ) : (
                  <div className="border rounded-md p-4 mb-4">
                    <h4 className="font-medium mb-3">Clientes Cadastrados</h4>
                    {asaasCustomersLoading ? (
                      <div className="flex justify-center p-4">
                        <span className="animate-spin mr-2"><Search className="h-5 w-5" /></span>
                        <span>Carregando clientes...</span>
                      </div>
                    ) : asaasCustomers && asaasCustomers.length > 0 ? (
                      <div className="max-h-[300px] overflow-y-auto">
                        <div className="space-y-2">
                          {asaasCustomers.map((customer: any) => (
                            <div 
                              key={customer.id}
                              className="border rounded-md p-3 hover:bg-green-50 cursor-pointer transition-colors"
                              onClick={() => handleCustomerSelect({
                                id: customer.id,
                                name: customer.name,
                                cpfCnpj: customer.cpfCnpj,
                                email: customer.email,
                                phone: customer.phone || customer.mobilePhone
                              })}
                            >
                              <div className="flex items-start">
                                <User className="h-5 w-5 mr-3 mt-0.5 text-gray-400" />
                                <div>
                                  <p className="font-medium">{customer.name}</p>
                                  <p className="text-sm text-gray-600">{formatCpfCnpj(customer.cpfCnpj)}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center p-4 text-gray-500">
                        <p>Nenhum cliente encontrado.</p>
                        <p className="mt-1 text-sm">Clique em "Buscar Cliente por CPF/CNPJ" para pesquisar um cliente específico.</p>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="text-sm text-amber-600 mt-2">
                  <strong>IMPORTANTE:</strong> O cliente deve estar cadastrado no Asaas antes de criar uma cobrança.
                  Se não encontrar o cliente, cadastre-o primeiro na página de Clientes.
                </div>
              </div>
            )}
          </div>
          
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Input placeholder="Descrição da cobrança" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="value"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor (R$)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => handleValueChange(e.target.value)}
                  />
                </FormControl>
                <FormDescription className="text-amber-500">
                  Taxa de 2.49%: {formatCurrency(finalValue)}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Vencimento</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "dd/MM/yyyy")
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="relatedSaleId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Venda Relacionada (opcional)</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma venda" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="0">Nenhuma venda</SelectItem>
                    {sales.map((sale) => (
                      <SelectItem key={sale.id} value={sale.id.toString()}>
                        Venda #{sale.id} - {formatCurrency(Number(sale.salePrice))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Associe esta cobrança a uma venda existente
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="billingType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma de Pagamento</FormLabel>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <Card
                      className={cn(
                        "cursor-pointer hover:border-primary transition-colors relative overflow-hidden",
                        field.value === "BOLETO" && "border-primary"
                      )}
                      onClick={() => handleBillingTypeChange("BOLETO")}
                    >
                      <CardContent className="p-4 flex flex-col items-center">
                        <Receipt className="h-6 w-6 mb-2" />
                        <span className="text-sm font-medium">Boleto</span>
                      </CardContent>
                      {field.value === "BOLETO" && (
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-primary" />
                      )}
                    </Card>
                    
                    <Card
                      className={cn(
                        "cursor-pointer hover:border-primary transition-colors relative overflow-hidden",
                        field.value === "PIX" && "border-primary"
                      )}
                      onClick={() => handleBillingTypeChange("PIX")}
                    >
                      <CardContent className="p-4 flex flex-col items-center">
                        <QrCode className="h-6 w-6 mb-2" />
                        <span className="text-sm font-medium">PIX</span>
                      </CardContent>
                      {field.value === "PIX" && (
                        <div className="absolute inset-x-0 bottom-0 h-1 bg-primary" />
                      )}
                    </Card>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="md:col-span-2">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Taxa de serviço</AlertTitle>
              <AlertDescription>
                O pagamento tem uma taxa de serviço de 2.49%. 
                Valor original: {formatCurrency(originalValue)} | 
                Valor com taxa: {formatCurrency(finalValue)}
              </AlertDescription>
            </Alert>
          </div>
          
          <div className="md:col-span-2">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informações adicionais sobre a cobrança"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button
            type="submit"
            className="w-full md:w-auto"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Gerando cobrança..." : "Gerar Cobrança"}
          </Button>
        </div>
      </form>
    </Form>
  );
}