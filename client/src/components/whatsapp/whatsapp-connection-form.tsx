import { useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { WhatsappConnection, insertWhatsappConnectionSchema } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface WhatsappConnectionFormProps {
  editingConnection: WhatsappConnection | null;
  onSave: () => void;
  onCancel: () => void;
}

// Estendendo o schema para validação
const formSchema = insertWhatsappConnectionSchema.extend({
  phoneNumber: z.string().min(10, "Número de telefone deve ter no mínimo 10 dígitos"),
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  dailyLimit: z.coerce.number().int().min(1, "Limite deve ser no mínimo 1").max(1000, "Limite deve ser no máximo 1000"),
});

export default function WhatsappConnectionForm({
  editingConnection,
  onSave,
  onCancel,
}: WhatsappConnectionFormProps) {
  const { toast } = useToast();
  const isEditing = !!editingConnection;

  // Definir o formulário
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phoneNumber: "",
      dailyLimit: 50,
    },
  });

  // Carregar valores padrão ao editar
  useEffect(() => {
    if (editingConnection) {
      form.reset({
        name: editingConnection.name,
        phoneNumber: editingConnection.phoneNumber,
        dailyLimit: editingConnection.dailyLimit || 50,
      });
    }
  }, [editingConnection, form]);

  // Obter queryClient no nível do componente
  const queryClient = useQueryClient();
  
  // Mutation para criar ou atualizar conexão
  const connectionMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      if (isEditing && editingConnection) {
        const res = await apiRequest(
          "PATCH", 
          `/api/whatsapp/connections/${editingConnection.id}`,
          values
        );
        return await res.json();
      } else {
        const res = await apiRequest(
          "POST", 
          "/api/whatsapp/connections",
          values
        );
        return await res.json();
      }
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Conexão atualizada" : "Conexão criada",
        description: isEditing 
          ? "A conexão foi atualizada com sucesso."
          : "A conexão foi criada com sucesso. Use o menu para conectar ao WhatsApp.",
      });
      
      // Invalidar queries para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/connections"] });
      
      onSave();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Erro ao ${isEditing ? "atualizar" : "criar"} conexão: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    connectionMutation.mutate(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Conexão</FormLabel>
              <FormControl>
                <Input placeholder="Ex: WhatsApp Principal" {...field} />
              </FormControl>
              <FormDescription>
                Um nome para identificar esta conexão.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Telefone</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Ex: 5511999999999" 
                  {...field} 
                  disabled={isEditing}
                />
              </FormControl>
              <FormDescription>
                Número de telefone com código do país (Ex: 5511999999999)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="dailyLimit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Limite Diário de Mensagens</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min={1} 
                  max={1000}
                  placeholder="50" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Limite máximo de mensagens por dia para esta conexão.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={connectionMutation.isPending}
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            disabled={connectionMutation.isPending}
          >
            {connectionMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isEditing ? "Atualizar" : "Criar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}