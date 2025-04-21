import { useEffect, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { WhatsappGroup, WhatsappContact, insertWhatsappGroupSchema } from "@shared/schema";
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
import { Loader2, Search, UserPlus, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface WhatsappGroupFormProps {
  editingGroup: WhatsappGroup | null;
  contacts: WhatsappContact[];
  onSave: () => void;
  onCancel: () => void;
}

// Estendendo o schema para validação
const formSchema = insertWhatsappGroupSchema.extend({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
});

export default function WhatsappGroupForm({
  editingGroup,
  contacts,
  onSave,
  onCancel,
}: WhatsappGroupFormProps) {
  const { toast } = useToast();
  const isEditing = !!editingGroup;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);

  // Definir o formulário
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Carregar os contatos do grupo ao editar
  const { data: groupContacts, isLoading: groupContactsLoading } = useQuery({
    queryKey: ["/api/whatsapp/groups", editingGroup?.id, "contacts"],
    queryFn: async () => {
      if (!editingGroup) return [];
      const res = await fetch(`/api/whatsapp/groups/${editingGroup.id}`);
      const data = await res.json();
      return data.contacts || [];
    },
    enabled: !!editingGroup,
  });

  // Carregar valores padrão ao editar
  useEffect(() => {
    if (editingGroup) {
      form.reset({
        name: editingGroup.name,
        description: editingGroup.description || "",
      });
    }
  }, [editingGroup, form]);

  // Atualizar os contatos selecionados quando os dados do grupo são carregados
  useEffect(() => {
    if (groupContacts && Array.isArray(groupContacts)) {
      setSelectedContacts(groupContacts.map((contact: WhatsappContact) => contact.id));
    }
  }, [groupContacts]);

  // Filtra a lista de contatos com base no termo de pesquisa
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phoneNumber.includes(searchTerm)
  );

  // Mutation para criar ou atualizar grupo
  const groupMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      let groupId: number;
      
      if (isEditing && editingGroup) {
        // Atualizar grupo existente
        const res = await apiRequest(
          "PATCH", 
          `/api/whatsapp/groups/${editingGroup.id}`,
          data
        );
        const updatedGroup = await res.json();
        groupId = updatedGroup.id;
      } else {
        // Criar novo grupo
        const res = await apiRequest(
          "POST", 
          "/api/whatsapp/groups",
          data
        );
        const newGroup = await res.json();
        groupId = newGroup.id;
      }
      
      // Adicionar contatos ao grupo (se selecionados)
      if (selectedContacts.length > 0) {
        await apiRequest(
          "POST",
          `/api/whatsapp/groups/${groupId}/contacts`,
          { contactIds: selectedContacts }
        );
      }
      
      return groupId;
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Grupo atualizado" : "Grupo criado",
        description: isEditing 
          ? "O grupo foi atualizado com sucesso."
          : "O grupo foi criado com sucesso.",
      });
      
      // Invalidar queries para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/groups"] });
      
      onSave();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: `Erro ao ${isEditing ? "atualizar" : "criar"} grupo: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    groupMutation.mutate(values);
  };

  const toggleContact = (contactId: number) => {
    setSelectedContacts(prevSelected => 
      prevSelected.includes(contactId)
        ? prevSelected.filter(id => id !== contactId)
        : [...prevSelected, contactId]
    );
  };

  const selectAllContacts = () => {
    setSelectedContacts(filteredContacts.map(contact => contact.id));
  };

  const unselectAllContacts = () => {
    setSelectedContacts([]);
  };

  return (
    <div className="space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Grupo</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Clientes VIP" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição (Opcional)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Descrição do grupo..." 
                    {...field} 
                    rows={3}
                  />
                </FormControl>
                <FormDescription>
                  Uma breve descrição para identificação do grupo.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="mt-8">
            <h3 className="text-lg font-medium">Selecionar Contatos</h3>
            <p className="text-sm text-gray-500 mb-4">
              Selecione os contatos que farão parte deste grupo.
            </p>
            
            <div className="flex space-x-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar contatos..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button 
                type="button" 
                variant="outline" 
                onClick={selectAllContacts}
                disabled={contacts.length === 0}
              >
                Selecionar Todos
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={unselectAllContacts}
                disabled={selectedContacts.length === 0}
              >
                Limpar Seleção
              </Button>
            </div>
            
            {groupContactsLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center p-4 border border-gray-200 rounded-md bg-gray-50">
                <p className="text-gray-600">Nenhum contato disponível</p>
                <p className="text-gray-500 text-sm">Adicione contatos primeiro.</p>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center p-4 border border-gray-200 rounded-md bg-gray-50">
                <p className="text-gray-600">Nenhum contato encontrado com este termo</p>
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Tags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.map((contact) => (
                      <TableRow key={contact.id} className="cursor-pointer" onClick={() => toggleContact(contact.id)}>
                        <TableCell>
                          <Checkbox
                            checked={selectedContacts.includes(contact.id)}
                            onCheckedChange={() => toggleContact(contact.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{contact.name}</TableCell>
                        <TableCell>{contact.phoneNumber}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {contact.tags && contact.tags.length > 0 ? (
                              contact.tags.map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-gray-400 text-xs">Sem tags</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            
            <div className="mt-4">
              <Badge variant="outline" className="text-sm">
                {selectedContacts.length} contatos selecionados
              </Badge>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={groupMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              type="submit"
              disabled={groupMutation.isPending}
            >
              {groupMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEditing ? "Atualizar Grupo" : "Criar Grupo"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}