import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Financing } from "@shared/schema";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Eye, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";
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

interface FinancingWithDetails extends Financing {
  customerName?: string;
  agentName?: string;
}

export function FinancingTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [financingToDelete, setFinancingToDelete] = useState<number | null>(null);
  
  const { data: financings, isLoading } = useQuery<FinancingWithDetails[]>({
    queryKey: ["/api/financings"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/financings/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Financiamento removido",
        description: "O financiamento foi removido com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/financings"] });
      setFinancingToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao remover o financiamento",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (financingToDelete) {
      deleteMutation.mutate(financingToDelete);
    }
  };

  const formatDate = (dateString?: string | Date | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getBankName = (bankId?: string) => {
    const banks: Record<string, string> = {
      banco_do_brasil: "Banco do Brasil",
      caixa: "Caixa Econômica",
      santander: "Santander",
      itau: "Itaú",
      bradesco: "Bradesco",
      outros: "Outros"
    };
    
    return banks[bankId || ""] || bankId;
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Aprovado</Badge>;
      case "analysis":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Em análise</Badge>;
      case "paid":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Pago</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Negado</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const columns: ColumnDef<FinancingWithDetails>[] = [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "customerName",
      header: "Cliente",
      cell: ({ row }) => row.original.customerName || `Cliente #${row.original.customerId}`,
    },
    {
      accessorKey: "bank",
      header: "Banco",
      cell: ({ row }) => getBankName(row.original.bank),
    },
    {
      accessorKey: "assetValue",
      header: "Valor",
      cell: ({ row }) => formatCurrency(Number(row.original.assetValue)),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: "expectedReturn",
      header: "Retorno",
      cell: ({ row }) => formatCurrency(Number(row.original.expectedReturn)),
    },
    {
      accessorKey: "agentName",
      header: "Agente",
      cell: ({ row }) => row.original.agentName || `Agente #${row.original.agentId}`,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const financing = row.original;
        
        return (
          <div className="flex items-center justify-end space-x-2">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/finances/${financing.id}/view`}>
                <Eye className="h-4 w-4" />
                <span className="sr-only">Ver</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/finances/${financing.id}/edit`}>
                <span>Editar</span>
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-red-500 hover:text-red-700"
                  onClick={() => setFinancingToDelete(financing.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Excluir</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir este financiamento?
                    Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setFinancingToDelete(null)}>Cancelar</AlertDialogCancel>
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
    <DataTable 
      columns={columns} 
      data={financings || []} 
      searchKey="customerName"
      searchPlaceholder="Buscar financiamentos..."
    />
  );
}
