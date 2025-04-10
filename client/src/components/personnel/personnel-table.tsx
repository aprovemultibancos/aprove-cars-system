import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Personnel } from "@shared/schema";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { formatCurrency, formatPhone } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PersonnelViewModal } from "./personnel-view-modal";

interface PersonnelTableProps {
  filter?: "employee" | "agent" | "dealer";
}

export function PersonnelTable({ filter }: PersonnelTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [personnelToDelete, setPersonnelToDelete] = useState<number | null>(null);
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);
  
  const { data: personnel, isLoading } = useQuery<Personnel[]>({
    queryKey: ["/api/personnel"],
  });

  // Apply filter if provided
  const filteredPersonnel = personnel 
    ? filter 
      ? personnel.filter(p => p.type === filter) 
      : personnel
    : [];

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/personnel/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Registro removido",
        description: "A pessoa foi removida com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/personnel"] });
      setPersonnelToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao remover o registro",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (personnelToDelete) {
      deleteMutation.mutate(personnelToDelete);
    }
  };

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case "employee":
        return "Funcionário";
      case "agent":
        return "Agente";
      case "dealer":
        return "Lojista";
      default:
        return "Desconhecido";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const columns: ColumnDef<Personnel>[] = [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "name",
      header: "Nome",
      cell: ({ row }) => {
        const person = row.original;
        return (
          <div className="flex items-center">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{getInitials(person.name)}</AvatarFallback>
            </Avatar>
            <div className="ml-4">
              <div className="font-medium">{person.name}</div>
              <div className="text-sm text-muted-foreground">{person.role}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: "Tipo",
      cell: ({ row }) => getTypeLabel(row.original.type),
    },
    {
      accessorKey: "document",
      header: "Documento",
    },
    {
      accessorKey: "phone",
      header: "Telefone",
      cell: ({ row }) => formatPhone(row.original.phone) || "—",
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => row.original.email || "—",
    },
    {
      accessorKey: "commissionRate",
      header: "Comissão",
      cell: ({ row }) => {
        const rate = row.original.commissionRate;
        return rate ? `${Number(rate).toFixed(2)}%` : "—";
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.original.isActive;
        return isActive 
          ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ativo</Badge>
          : <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Inativo</Badge>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const person = row.original;
        
        return (
          <div className="flex items-center justify-end space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedPersonnel(person)}
            >
              <Eye className="h-4 w-4" />
              <span className="sr-only">Ver</span>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-red-500 hover:text-red-700"
                  onClick={() => setPersonnelToDelete(person.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Excluir</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir {person.name}?
                    Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setPersonnelToDelete(null)}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
    },
  ];

  if (isLoading) {
    return <div className="animate-pulse p-4 space-y-4">
      <div className="h-8 bg-gray-100 rounded w-1/4"></div>
      <div className="h-64 bg-gray-100 rounded w-full"></div>
    </div>;
  }

  return (
    <>
      <DataTable 
        columns={columns} 
        data={filteredPersonnel} 
        searchKey="name"
        searchPlaceholder="Buscar por nome..."
      />
      
      {selectedPersonnel && (
        <PersonnelViewModal
          personnel={selectedPersonnel}
          open={!!selectedPersonnel}
          onOpenChange={(open) => {
            if (!open) setSelectedPersonnel(null);
          }}
        />
      )}
    </>
  );
}
