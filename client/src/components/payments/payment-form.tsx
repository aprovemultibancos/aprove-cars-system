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
import { CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn, formatCurrency } from "@/lib/utils";
import { Customer, Sale } from "@shared/schema";
import { AlertCircle, CreditCard, Receipt, QrCode } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Definir o schema do formulário de pagamento
const paymentFormSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(1, "Nome do cliente é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  value: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  dueDate: z.date({
    required_error: "Data de vencimento é obrigatória",
  }),
  billingType: z.enum(["BOLETO", "PIX"], {
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
  
  // Definir valores padrão para o formulário
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      customerId: "manual",
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
    form.setValue("billingType", type as "BOLETO" | "PIX");
    
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
      return await apiRequest("POST", "/api/payments", data);
    },
    onSuccess: () => {
      toast({
        title: "Pagamento criado",
        description: "O pagamento foi criado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao criar o pagamento",
        variant: "destructive",
      });
    },
  });
  
  function onSubmit(data: PaymentFormValues) {
    // Ajustar o valor para incluir a taxa de 2.49%
    data.value = finalValue;
    
    mutation.mutate(data);
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <input type="hidden" name="customerId" value="manual" />
            
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Cliente Manual</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Digite o nome do cliente" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Digite o nome do cliente que receberá a cobrança
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
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