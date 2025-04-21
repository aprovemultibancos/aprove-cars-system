import { useState } from "react";
import { WhatsappContact } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  RefreshCw,
  Send,
  Ban,
} from "lucide-react";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface WhatsappContactsListProps {
  contacts: WhatsappContact[];
  isLoading: boolean;
  error: Error | null;
  onEdit: (contact: WhatsappContact) => void;
  onRefresh: () => void;
}

export default function WhatsappContactsList({
  contacts,
  isLoading,
  error,
  onEdit,
  onRefresh,
}: WhatsappContactsListProps) {
  const { toast } = useToast();
  const [contactToDelete, setContactToDelete] = useState<number | null>(null);

  // Mutation para deletar
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/whatsapp/contacts/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Contato excluído",
        description: "O contato foi excluído com sucesso.",
      });
      onRefresh();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir contato",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const confirmDelete = (id: number) => {
    setContactToDelete(id);
  };

  const handleDelete = () => {
    if (contactToDelete) {
      deleteMutation.mutate(contactToDelete);
      setContactToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <RefreshCw className="animate-spin h-6 w-6 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 border border-red-200 rounded-md bg-red-50">
        <p className="text-red-600">Erro ao carregar contatos: {error.message}</p>
        <Button variant="outline" onClick={onRefresh} className="mt-2">
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="text-center p-4 border border-gray-200 rounded-md bg-gray-50">
        <p className="text-gray-600">Nenhum contato encontrado</p>
        <p className="text-gray-500 text-sm">Clique no botão "Adicionar Contato" para criar um novo contato.</p>
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Última Mensagem</TableHead>
            <TableHead className="w-[100px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => (
            <TableRow key={contact.id}>
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
              <TableCell>
                {contact.isBlocked ? (
                  <Badge variant="destructive">Bloqueado</Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                    Ativo
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {contact.lastMessageSent
                  ? format(new Date(contact.lastMessageSent), "dd/MM/yyyy HH:mm")
                  : "Nunca mensagem"}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Abrir menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onEdit(contact)}>
                      <Edit className="mr-2 h-4 w-4" />
                      <span>Editar</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Send className="mr-2 h-4 w-4" />
                      <span>Enviar Mensagem</span>
                    </DropdownMenuItem>
                    {contact.isBlocked ? (
                      <DropdownMenuItem>
                        <Ban className="mr-2 h-4 w-4" />
                        <span>Desbloquear</span>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem>
                        <Ban className="mr-2 h-4 w-4" />
                        <span>Bloquear</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={() => confirmDelete(contact.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Excluir</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!contactToDelete} onOpenChange={() => setContactToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir contato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este contato? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}