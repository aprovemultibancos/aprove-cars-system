import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertPersonnelSchema, Personnel } from "@shared/schema";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

// Extended schema with validation
const extendedPersonnelSchema = insertPersonnelSchema.extend({
  name: z.string().min(3, "Nome é obrigatório"),
  type: z.enum(["employee", "agent", "dealer"]),
  document: z.string().min(3, "Documento é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal('')),
  phone: z.string().min(10, "Telefone inválido").optional().or(z.literal('')),
  role: z.string().min(1, "Cargo é obrigatório"),
  isActive: z.boolean().default(true),
  commissionRate: z.coerce.number().min(0, "Valor inválido").optional(),
  bankInfo: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

type PersonnelFormValues = z.infer<typeof extendedPersonnelSchema>;

interface PersonnelFormProps {
  editPersonnel?: Personnel;
}

export function PersonnelForm({ editPersonnel }: PersonnelFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const defaultValues: Partial<PersonnelFormValues> = editPersonnel
    ? {
        name: editPersonnel.name,
        type: editPersonnel.type as "employee" | "agent" | "dealer",
        document: editPersonnel.document,
        email: editPersonnel.email || "",
        phone: editPersonnel.phone || "",
        role: editPersonnel.role,
        isActive: editPersonnel.isActive,
        commissionRate: Number(editPersonnel.commissionRate) || 0,
        bankInfo: editPersonnel.bankInfo || "",
        notes: editPersonnel.notes || "",
      }
    : {
        name: "",
        type: "employee",
        document: "",
        email: "",
        phone: "",
        role: "",
        isActive: true,
        commissionRate: 0,
        bankInfo: "",
        notes: "",
      };

  const form = useForm<PersonnelFormValues>({
    resolver: zodResolver(extendedPersonnelSchema),
    defaultValues,
  });

  const mutation = useMutation({
    mutationFn: async (data: PersonnelFormValues) => {
      const endpoint = editPersonnel ? `/api/personnel/${editPersonnel.id}` : "/api/personnel";
      const method = editPersonnel ? "PATCH" : "POST";
      return await apiRequest(method, endpoint, data);
    },
    onSuccess: () => {
      toast({
        title: editPersonnel ? "Pessoa atualizada" : "Pessoa cadastrada",
        description: editPersonnel
          ? "A pessoa foi atualizada com sucesso"
          : "A pessoa foi cadastrada com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/personnel"] });
      navigate("/personnel");
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao salvar a pessoa",
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: PersonnelFormValues) {
    mutation.mutate(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Nome completo" {...field} />
                </FormControl>
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
                    <SelectItem value="employee">Funcionário</SelectItem>
                    <SelectItem value="agent">Agente</SelectItem>
                    <SelectItem value="dealer">Lojista</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="document"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CPF/CNPJ</FormLabel>
                <FormControl>
                  <Input placeholder="Digite o documento" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cargo</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Vendedor, Gerente, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="email@exemplo.com" {...field} />
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
                  <Input placeholder="(00) 00000-0000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="commissionRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Taxa de Comissão (%)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} />
                </FormControl>
                <FormDescription>
                  Percentual de comissão aplicado sobre vendas/financiamentos
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Ativo</FormLabel>
                  <FormDescription>
                    Esta pessoa está atualmente ativa?
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="bankInfo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Informações Bancárias</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Banco, agência, conta, etc." 
                  className="min-h-20"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
            onClick={() => navigate("/personnel")}
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Salvando..." : (editPersonnel ? "Atualizar" : "Cadastrar")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
