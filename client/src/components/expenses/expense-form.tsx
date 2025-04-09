import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { insertExpenseSchema, Expense, Personnel } from "@shared/schema";
import { Button } from "@/components/ui/button";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

// Extended schema with validation
const extendedExpenseSchema = insertExpenseSchema.extend({
  description: z.string().min(3, "Descrição é obrigatória"),
  amount: z.coerce.number().positive("Valor deve ser positivo"),
  date: z.date(),
  category: z.string().min(1, "Categoria é obrigatória"),
  type: z.enum(["fixed", "variable"]),
  payeeId: z.coerce.number().optional(),
  notes: z.string().optional().or(z.literal('')),
});

type ExpenseFormValues = z.infer<typeof extendedExpenseSchema>;

interface ExpenseFormProps {
  editExpense?: Expense;
}

export function ExpenseForm({ editExpense }: ExpenseFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { data: personnel } = useQuery<Personnel[]>({
    queryKey: ["/api/personnel"],
  });

  const parseDate = (dateString?: string | null): Date => {
    if (!dateString) return new Date();
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? new Date() : date;
  };

  const defaultValues: Partial<ExpenseFormValues> = editExpense
    ? {
        description: editExpense.description,
        amount: Number(editExpense.amount),
        date: parseDate(editExpense.date?.toString()),
        category: editExpense.category,
        type: editExpense.type as "fixed" | "variable",
        payeeId: editExpense.payeeId || undefined,
        notes: editExpense.notes || "",
      }
    : {
        description: "",
        amount: 0,
        date: new Date(),
        category: "Aluguel", // Categoria padrão alterada de "Outros" para "Aluguel"
        type: "variable",
        notes: "",
      };

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(extendedExpenseSchema),
    defaultValues,
  });

  const mutation = useMutation({
    mutationFn: async (data: ExpenseFormValues) => {
      const endpoint = editExpense ? `/api/expenses/${editExpense.id}` : "/api/expenses";
      const method = editExpense ? "PATCH" : "POST";
      return await apiRequest(method, endpoint, data);
    },
    onSuccess: () => {
      toast({
        title: editExpense ? "Despesa atualizada" : "Despesa cadastrada",
        description: editExpense
          ? "A despesa foi atualizada com sucesso"
          : "A despesa foi cadastrada com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      navigate("/expenses");
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao salvar a despesa",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: ExpenseFormValues) {
    mutation.mutate(data);
  }

  const expenseCategories = [
    "Salário",
    "Comissão",
    "Aluguel",
    "Documentação",
    "Manutenção",
    "Marketing",
    "Impostos",
    "Utilities",
    "Combustível",
    "Outros"
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Aluguel do escritório" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data</FormLabel>
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
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {expenseCategories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="fixed">Fixa</SelectItem>
                    <SelectItem value="variable">Variável</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="payeeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Beneficiário</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} 
                  defaultValue={field.value?.toString()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o beneficiário (opcional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="0">Nenhum</SelectItem>
                    {personnel?.map((person) => (
                      <SelectItem key={person.id} value={person.id.toString()}>
                        {person.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Opcional. Selecione se a despesa está relacionada a uma pessoa específica.
                </FormDescription>
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
            onClick={() => navigate("/expenses")}
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Salvando..." : (editExpense ? "Atualizar" : "Cadastrar")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
