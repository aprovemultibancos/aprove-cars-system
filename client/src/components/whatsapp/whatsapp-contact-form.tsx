import { useEffect, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { WhatsappContact, insertWhatsappContactSchema, Customer } from "@shared/schema";
import { useMutation, useQuery, queryClient } from "@tanstack/react-query";
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
import { Loader2, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface WhatsappContactFormProps {
  editingContact: WhatsappContact | null;
  onSave: () => void;
  onCancel: () => void;
}

// Estendendo o schema para validação
const formSchema = insertWhatsappContactSchema.extend({
  phoneNumber: z.string().min(10, "Número de telefone deve ter no mínimo 10 dígitos"),
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  tag: z.string().optional()
});

// Schema de formulário com campo de tag adicional
type FormValues = z.infer<typeof formSchema> & {
  tag?: string;
};

export default function WhatsappContactForm({
  editingContact,
  onSave,
  onCancel,
}: WhatsappContactFormProps) {
  const { toast } = useToast();
  const isEditing = !!editingContact;
  const [tags, setTags] = useState<string[]>([]);
  
  // Carregar clientes para o selector
  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ["/api/customers"],
    enabled: true
  });

  // Definir o formulário
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phoneNumber: "",
      customerId: null,
      tags: [],
      isBlocked: false,
      tag: ""
    },
  });

  // Carregar valores padrão ao editar
  useEffect(() => {
    if (editingContact) {
      form.reset({
        name: editingContact.name,
        phoneNumber: editingContact.phoneNumber,
        customerId: editingContact.customerId,
        isBlocked: editingContact.isBlocked,
        tags: editingContact.tags || [],
      });
      
      if (editingContact.tags) {
        setTags(editingContact.tags);
      }
    }
  }, [editingContact, form]);

  // Mutation para criar ou atualizar contato
  const contactMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      // Remover o campo tag temporário e atualizar tags
      const { tag, ...values } = data;
      const contactData = {
        ...values,
        tags
      };
      
      if (isEditing && editingContact) {
        const res = await apiRequest(
          "PATCH", 
          `/api/whatsapp/contacts/${editingContact.id}`,
          contactData
        );
        return await res.json();
      } else {
        const res = await apiRequest(
          "POST", 
          "/api/whatsapp/contacts",
          contactData
        );
        return await res.json();
      }
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Contato atualizado" : "Contato criado",
        description: isEditing 
          ? "O contato foi atualizado com sucesso."
          : "O contato foi criado com sucesso.",
      });
      
      // Invalidar queries para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/contacts"] });
      
      onSave();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Erro ao ${isEditing ? "atualizar" : "criar"} contato: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    contactMutation.mutate(values);
  };

  const addTag = () => {
    const tag = form.getValues("tag");
    if (tag && tag.trim() && !tags.includes(tag.trim())) {
      setTags([...tags, tag.trim()]);
      form.setValue("tag", "");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Nome do contato" {...field} />
              </FormControl>
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
          name="customerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cliente Associado (Opcional)</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                value={field.value?.toString() || ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {customersLoading ? (
                    <SelectItem value="" disabled>Carregando...</SelectItem>
                  ) : customers && customers.length > 0 ? (
                    customers.map((customer: Customer) => (
                      <SelectItem key={customer.id} value={customer.id.toString()}>
                        {customer.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>Nenhum cliente disponível</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                Opcional: vincule este contato a um cliente existente.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="tag"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tags</FormLabel>
                <div className="flex space-x-2">
                  <FormControl>
                    <Input 
                      placeholder="Adicionar tag..." 
                      {...field} 
                      onKeyPress={handleTagKeyPress}
                    />
                  </FormControl>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={addTag}
                  >
                    Adicionar
                  </Button>
                </div>
                <FormDescription>
                  Pressione Enter ou clique em Adicionar para incluir uma tag.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.length > 0 ? (
              tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="px-3 py-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-2 text-red-500 hover:text-red-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <span className="text-sm text-gray-500">Nenhuma tag adicionada.</span>
            )}
          </div>
        </div>
        
        <FormField
          control={form.control}
          name="isBlocked"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Bloquear Contato</FormLabel>
                <FormDescription>
                  Bloquear este contato impedirá o envio de mensagens para ele.
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

        <div className="flex justify-end gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={contactMutation.isPending}
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            disabled={contactMutation.isPending}
          >
            {contactMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isEditing ? "Atualizar" : "Criar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}