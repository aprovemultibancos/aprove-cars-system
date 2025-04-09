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
  customerId: z.coerce.number().positive("Cliente é obrigatório"),
  bank: z.string().min(1, "Banco é obrigatório"),
  assetValue: z.coerce.number().positive("Valor do bem é obrigatório"),
  releasedAmount: z.coerce.number().positive("Valor liberado é obrigatório"),
  expectedReturn: z.coerce.number().positive("Retorno esperado é obrigatório"),
  agentCommission: z.coerce.number().min(0, "Comissão inválida"),
  sellerCommission: z.coerce.number().min(0, "Comissão inválida"),
  status: z.enum(["analysis", "approved", "paid", "rejected"]),
  analysisDate: z.date().optional().nullable(),
  approvalDate: z.date().optional().nullable(),
  paymentDate: z.date().optional().nullable(),
  agentId: z.coerce.number().positive("Agente é obrigatório"),
  notes: z.string().optional(),
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

  const defaultValues: Partial<FinancingFormValues> = editFinancing
    ? {
        customerId: editFinancing.customerId,
        bank: editFinancing.bank,
        assetValue: Number(editFinancing.assetValue),
        releasedAmount: Number(editFinancing.releasedAmount),
        expectedReturn: Number(editFinancing.expectedReturn),
        agentCommission: Number(editFinancing.agentCommission),
        sellerCommission: Number(editFinancing.sellerCommission),
        status: editFinancing.status as "analysis" | "approved" | "paid" | "rejected",
        analysisDate: parseDate(editFinancing.analysisDate?.toString()),
        approvalDate: parseDate(editFinancing.approvalDate?.toString()),
        paymentDate: parseDate(editFinancing.paymentDate?.toString()),
        agentId: editFinancing.agentId,
        notes: editFinancing.notes || "",
      }
    : {
        bank: "",
        assetValue: 0,
        releasedAmount: 0,
        expectedReturn: 0,
        agentCommission: 0,
        sellerCommission: 0,
        status: "analysis",
        notes: "",
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
    mutation.mutate(data);
  }

  const calculateProfit = () => {
    const assetValue = form.watch("assetValue") || 0;
    const releasedAmount = form.watch("releasedAmount") || 0;
    const agentCommission = form.watch("agentCommission") || 0;
    const sellerCommission = form.watch("sellerCommission") || 0;
    
    return releasedAmount - assetValue - agentCommission - sellerCommission;
  };

  const profit = calculateProfit();

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {customers?.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o banco" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="banco_do_brasil">Banco do Brasil</SelectItem>
                    <SelectItem value="caixa">Caixa Econômica Federal</SelectItem>
                    <SelectItem value="santander">Santander</SelectItem>
                    <SelectItem value="itau">Itaú</SelectItem>
                    <SelectItem value="bradesco">Bradesco</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
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
                      form.trigger(["assetValue", "releasedAmount"]);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="releasedAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor Liberado (R$)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    {...field} 
                    onChange={(e) => {
                      field.onChange(e);
                      form.trigger(["assetValue", "releasedAmount"]);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expectedReturn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Retorno Esperado (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
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
                <FormLabel>Agente</FormLabel>
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
                  <Input type="number" step="0.01" {...field} />
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
                  <Input type="number" step="0.01" {...field} />
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="analysisDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Análise</FormLabel>
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
                      selected={field.value || undefined}
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
            name="approvalDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Aprovação</FormLabel>
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
                      selected={field.value || undefined}
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
            name="paymentDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Pagamento</FormLabel>
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
                      selected={field.value || undefined}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
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
