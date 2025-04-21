import { useState } from "react";
import { WhatsappGroup } from "@shared/schema";
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
  Users,
  UserPlus
} from "lucide-react";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface WhatsappGroupsListProps {
  groups: WhatsappGroup[];
  isLoading: boolean;
  error: Error | null;
  onEdit: (group: WhatsappGroup) => void;
  onRefresh: () => void;
}

export default function WhatsappGroupsList({
  groups,
  isLoading,
  error,
  onEdit,
  onRefresh,
}: WhatsappGroupsListProps) {
  const { toast } = useToast();
  const [groupToDelete, setGroupToDelete] = useState<number | null>(null);

  // Mutation para deletar
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/whatsapp/groups/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Grupo excluído",
        description: "O grupo foi excluído com sucesso.",
      });
      onRefresh();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir grupo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const confirmDelete = (id: number) => {
    setGroupToDelete(id);
  };

  const handleDelete = () => {
    if (groupToDelete) {
      deleteMutation.mutate(groupToDelete);
      setGroupToDelete(null);
    }
  };

  const handleAddContacts = (id: number) => {
    // Implementar no futuro, por enquanto apenas mostra toast
    toast({
      title: "Adicionar contatos",
      description: "Funcionalidade a ser implementada.",
    });
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
        <p className="text-red-600">Erro ao carregar grupos: {error.message}</p>
        <Button variant="outline" onClick={onRefresh} className="mt-2">
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center p-4 border border-gray-200 rounded-md bg-gray-50">
        <p className="text-gray-600">Nenhum grupo encontrado</p>
        <p className="text-gray-500 text-sm">Clique no botão "Adicionar Grupo" para criar um novo grupo.</p>
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Total de Contatos</TableHead>
            <TableHead>Data de Criação</TableHead>
            <TableHead className="w-[100px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <TableRow key={group.id}>
              <TableCell className="font-medium">{group.name}</TableCell>
              <TableCell>{group.description || "Sem descrição"}</TableCell>
              <TableCell>
                <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                  {group.totalContacts} contatos
                </Badge>
              </TableCell>
              <TableCell>
                {group.createdAt
                  ? format(new Date(group.createdAt), "dd/MM/yyyy")
                  : "—"}
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
                    <DropdownMenuItem onClick={() => onEdit(group)}>
                      <Edit className="mr-2 h-4 w-4" />
                      <span>Editar</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddContacts(group.id)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      <span>Adicionar Contatos</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Send className="mr-2 h-4 w-4" />
                      <span>Enviar Mensagem</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => confirmDelete(group.id)}
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
      <AlertDialog open={!!groupToDelete} onOpenChange={() => setGroupToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir grupo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este grupo? Esta ação não pode ser desfeita e todos os contatos serão removidos do grupo.
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