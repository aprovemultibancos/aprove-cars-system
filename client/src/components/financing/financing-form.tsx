import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { insertFinancingSchema, Financing, Customer, Personnel } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

// Extended schema with validation
const extendedFinancingSchema = insertFinancingSchema.extend({
  customerName: z.string().min(1, "Nome do cliente é obrigatório"),
  bank: z.string().min(1, "Banco é obrigatório"),
  assetValue: z.coerce.number().positive("Valor do bem é obrigatório"),
  returnType: z.enum(["R0", "R1", "R2", "R3", "R4", "R6", "RF"], {
    required_error: "Selecione o tipo de retorno",
  }),
  accessoriesPercentage: z.coerce.number().min(0, "Percentual inválido"),
  feeAmount: z.coerce.number().min(0, "Valor da taxa inválido"),
  agentCommission: z.coerce.number().min(0, "Comissão inválida"),
  sellerCommission: z.coerce.number().min(0, "Comissão inválida"),
  status: z.enum(["analysis", "approved", "paid", "rejected"]),
  agentId: z.coerce.number().positive("Agente é obrigatório"),
  notes: z.string().optional(),
  // Adicionando campos que estavam faltando no esquema estendido
  releasedAmount: z.any().optional(),
  expectedReturn: z.any().optional(),
});

type FinancingFormValues = z.infer<typeof extendedFinancingSchema>;

interface FinancingFormProps {
  editFinancing?: Financing;
}

export function FinancingForm({ editFinancing }: FinancingFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: agents } = useQuery<Personnel[]>({
    queryKey: ["/api/personnel/agents"],
  });

  // Parse dates from string to Date or null
  const parseDate = (dateString?: string | null): Date | null => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  };

  // Garantir que todos os campos obrigatórios tenham valores padrão
  const defaultValues: Partial<FinancingFormValues> = editFinancing
    ? {
        customerName: editFinancing.customerName || "",
        bank: editFinancing.bank || "",
        assetValue: Number(editFinancing.assetValue) || 0,
        returnType: (editFinancing.returnType as "R0" | "R1" | "R2" | "R3" | "R4" | "R6" | "RF") || "R0",
        accessoriesPercentage: Number(editFinancing.accessoriesPercentage) || 0,
        feeAmount: Number(editFinancing.feeAmount) || 0,
        agentCommission: Number(editFinancing.agentCommission) || 0,
        sellerCommission: Number(editFinancing.sellerCommission) || 0,
        status: (editFinancing.status as "analysis" | "approved" | "paid" | "rejected") || "analysis",
        agentId: Number(editFinancing.agentId) || 1, // Valor padrão para o agentId
        notes: editFinancing.notes || "",
        releasedAmount: editFinancing.releasedAmount?.toString() || "0",
        expectedReturn: editFinancing.expectedReturn?.toString() || "0",
      }
    : {
        customerName: "",
        bank: "",
        assetValue: 0,
        returnType: "R0",
        accessoriesPercentage: 0,
        feeAmount: 0,
        agentCommission: 0,
        sellerCommission: 0,
        status: "analysis",
        agentId: 1, // Valor padrão para o agentId
        notes: "",
        releasedAmount: "0",
        expectedReturn: "0",
      };

  const form = useForm<FinancingFormValues>({
    resolver: zodResolver(extendedFinancingSchema),
    defaultValues,
  });

  const mutation = useMutation({
    mutationFn: async (data: FinancingFormValues) => {
      const endpoint = editFinancing ? `/api/financings/${editFinancing.id}` : "/api/financings";
      const method = editFinancing ? "PATCH" : "POST";
      return await apiRequest(method, endpoint, data);
    },
    onSuccess: () => {
      toast({
        title: editFinancing ? "Financiamento atualizado" : "Financiamento cadastrado",
        description: editFinancing
          ? "O financiamento foi atualizado com sucesso"
          : "O financiamento foi cadastrado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/financings"] });
      navigate("/finances");
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao salvar o financiamento",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: FinancingFormValues) {
    // Garantir que todos os campos obrigatórios estejam presentes e no formato correto
    const submittingData = {
      ...data,
      customerId: null, // Adicionar customerId como null (opcional no schema)
      releasedAmount: data.releasedAmount || "0",
      expectedReturn: data.expectedReturn || String(calculateReturnAmount()),
      // Certificar que campos numéricos são enviados como números
      assetValue: Number(data.assetValue),
      accessoriesPercentage: Number(data.accessoriesPercentage || 0),
      feeAmount: Number(data.feeAmount || 0),
      agentCommission: Number(data.agentCommission),
      sellerCommission: Number(data.sellerCommission)
    };
    
    console.log("Enviando dados do formulário:", submittingData);
    mutation.mutate(submittingData);
  }

  // Calcula o valor do retorno baseado no tipo selecionado (R0, R1, R2, etc.)
  const calculateReturnAmount = () => {
    const assetValue = form.watch("assetValue") || 0;
    const returnType = form.watch("returnType") || "R0";
    
    // Percentuais de retorno baseados no tipo
    const returnPercentages: {[key: string]: number} = {
      "R0": 0,
      "R1": 0.012, // 1.2%
      "R2": 0.024, // 2.4%
      "R3": 0.036, // 3.6%
      "R4": 0.048, // 4.8%
      "R6": 0.060, // 6.0%
      "RF": 0.015  // 1.5%
    };
    
    return assetValue * (returnPercentages[returnType] || 0);
  };

  // Calcula o valor do tributo (7% do valor de retorno)
  const calculateTaxAmount = () => {
    const returnAmount = calculateReturnAmount();
    return returnAmount * 0.07; // 7% do valor de retorno
  };
  
  // Calcula o lucro estimado com a nova fórmula
  const calculateProfit = () => {
    const assetValue = form.watch("assetValue") || 0;
    const returnAmount = calculateReturnAmount();
    const accessoriesPercentage = form.watch("accessoriesPercentage") || 0;
    const accessoriesValue = assetValue * (accessoriesPercentage / 100);
    const feeAmount = form.watch("feeAmount") || 0;
    const agentCommission = form.watch("agentCommission") || 0;
    const sellerCommission = form.watch("sellerCommission") || 0;
    
    // ILA: 25.5% do valor de retorno
    const ilaAmount = returnAmount * 0.255;
    
    // Lucro = Retorno - ILA + Acessórios + Taxa - Comissão do agente - Comissão do vendedor
    return returnAmount - ilaAmount + accessoriesValue + feeAmount - agentCommission - sellerCommission;
  };

  const profit = calculateProfit();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="customerName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <FormControl>
                  <Input placeholder="Digite o nome do cliente" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bank"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Banco</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Digite o nome do banco" 
                    {...field} 
                    value={field.value || ""}
                  />
                </FormControl>
                <div className="text-xs text-muted-foreground mt-1">Digite manualmente o nome do banco</div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="assetValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor do Bem (R$)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    {...field} 
                    onChange={(e) => {
                      field.onChange(e);
                      form.trigger(["assetValue"]);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="returnType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Retorno</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    field.onChange(value);
                    form.trigger();  // Atualiza os cálculos
                  }} 
                  defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de retorno" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="R0">R0 = 0%</SelectItem>
                    <SelectItem value="R1">R1 = 1,2%</SelectItem>
                    <SelectItem value="R2">R2 = 2,4%</SelectItem>
                    <SelectItem value="R3">R3 = 3,6%</SelectItem>
                    <SelectItem value="R4">R4 = 4,8%</SelectItem>
                    <SelectItem value="R6">R6 = 6,0%</SelectItem>
                    <SelectItem value="RF">RF = 1,5%</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accessoriesPercentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Percentual de Acessórios (%)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    {...field} 
                    onChange={(e) => {
                      field.onChange(e);
                      form.trigger();
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="feeAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor da Taxa (R$)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      form.trigger();
                    }} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Campo oculto para releasedAmount */}
          <FormField
            control={form.control}
            name="releasedAmount"
            render={({ field }) => (
              <input type="hidden" {...field} value={field.value || 0} />
            )}
          />
          
          {/* Campo oculto para expectedReturn, mas mantendo a atualização do valor */}
          <FormField
            control={form.control}
            name="expectedReturn"
            render={({ field }) => {
              // Use effect para atualizar o valor quando necessário
              React.useEffect(() => {
                const returnAmount = calculateReturnAmount();
                field.onChange(returnAmount);
              }, [form.watch("assetValue"), form.watch("returnType")]);
              
              return (
                <input type="hidden" {...field} value={field.value || 0} />
              );
            }}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="analysis">Em Análise</SelectItem>
                    <SelectItem value="approved">Aprovado</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="rejected">Rejeitado</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="agentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Agente/Loja</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o agente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {agents?.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id.toString()}>
                        {agent.name}
                      </SelectItem>
                    ))}
                    {!agents?.length && (
                      <SelectItem value="1">Agente Padrão</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="agentCommission"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Comissão do Agente (R$)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      form.trigger();
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="sellerCommission"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Comissão do Vendedor (R$)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      form.trigger();
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center p-4 border border-green-100 rounded-md bg-green-50">
            <div className="text-green-800">
              <div className="text-sm font-medium">Lucro Estimado</div>
              <div className="text-lg font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(profit)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center p-4 border border-green-100 rounded-md bg-green-50">
            <div className="text-green-800">
              <div className="text-sm font-medium">Tributação (7% do Retorno)</div>
              <div className="text-lg font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateTaxAmount())}
              </div>
            </div>
          </div>
          
          <div className="flex items-center p-4 border border-blue-100 rounded-md bg-blue-50">
            <div className="text-blue-800">
              <div className="text-sm font-medium">Retorno Total</div>
              <div className="text-lg font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateReturnAmount())}
              </div>
            </div>
          </div>
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea placeholder="Observações adicionais..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/finances")}
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Salvando..." : (editFinancing ? "Atualizar" : "Cadastrar")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
