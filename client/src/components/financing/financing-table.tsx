import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Financing } from "@shared/schema";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, Check, FileQuestion } from "lucide-react";
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
import { FinancingViewModal } from "./financing-view-modal";

interface FinancingWithDetails {
  id: number;
  customerId: number | null;
  customerName: string;
  bank: string;
  assetValue: string;
  returnType: "R0" | "R1" | "R2" | "R3" | "R4" | "R6" | "RF";
  accessoriesPercentage: string | null;
  feeAmount: string | null;
  releasedAmount: string | null;
  expectedReturn: string | null;
  agentCommission: string;
  sellerCommission: string;
  status: string;
  agentId: number;
  agentName?: string;
  notes: string | null;
  createdAt: Date;
}

export function FinancingTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [financingToDelete, setFinancingToDelete] = useState<number | null>(null);
  const [selectedFinancing, setSelectedFinancing] = useState<Financing | null>(null);
  const [financingStatuses, setFinancingStatuses] = useState<Record<number, "paid" | "analysis">>({});
  
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

  // Função para alternar o status de um financiamento
  const toggleFinancingStatus = (financingId: number) => {
    setFinancingStatuses(prev => {
      const currentStatus = prev[financingId] || getFinancingStatus(financingId);
      const newStatus = currentStatus === 'paid' ? 'analysis' : 'paid';
      
      return {
        ...prev,
        [financingId]: newStatus
      };
    });
    
    // Aqui você também poderia implementar uma chamada à API para salvar o status no servidor
  };
  
  // Obtém o status atual do financiamento (do estado local ou do valor original)
  const getFinancingStatus = (financingId: number): "paid" | "analysis" => {
    // Se temos um status personalizado definido, usamos ele
    if (financingStatuses[financingId]) {
      return financingStatuses[financingId];
    }
    
    // Caso contrário, verificamos o status original do financiamento
    const financing = financings?.find(f => f.id === financingId);
    if (financing) {
      // Convertemos outros status para apenas 'paid' ou 'analysis'
      return financing.status === 'paid' ? 'paid' : 'analysis';
    }
    
    // Padrão é 'Em Análise'
    return 'analysis';
  };

  // Exibe o badge de status correspondente
  const getStatusBadge = (financingId: number) => {
    const status = getFinancingStatus(financingId);
    
    if (status === 'paid') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Pago</Badge>;
    } else {
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Em Análise</Badge>;
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
      cell: ({ row }) => getStatusBadge(row.original.id),
    },
    {
      id: "changeStatus",
      header: "Mudar Status",
      cell: ({ row }) => {
        const financing = row.original;
        const currentStatus = getFinancingStatus(financing.id);
        
        return (
          <Button
            variant="outline"
            size="sm"
            className={currentStatus === 'paid' 
              ? "bg-blue-100 border-blue-200 text-blue-800 hover:bg-blue-200" 
              : "bg-green-100 border-green-200 text-green-800 hover:bg-green-200"
            }
            onClick={() => toggleFinancingStatus(financing.id)}
          >
            {currentStatus === 'paid' ? (
              <>
                <FileQuestion className="h-4 w-4 mr-1" />
                Em Análise
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                Pago
              </>
            )}
          </Button>
        );
      },
    },
    {
      accessorKey: "expectedReturn",
      header: "Retorno",
      cell: ({ row }) => formatCurrency(Number(row.original.expectedReturn)),
    },
    {
      accessorKey: "agentName",
      header: "Agente",
      cell: ({ row }) => {
        return (
          <div className="flex items-center">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">
              {row.original.agentName || "Não designado"}
            </Badge>
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const financing = row.original;
        
        return (
          <div className="flex items-center justify-end space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedFinancing(financing)}
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
    <>
      <DataTable 
        columns={columns} 
        data={financings || []} 
        searchKey="customerName"
        searchPlaceholder="Buscar financiamentos..."
      />
      
      {selectedFinancing && (
        <FinancingViewModal
          financing={selectedFinancing as any}
          open={!!selectedFinancing}
          onOpenChange={(open) => {
            if (!open) setSelectedFinancing(null);
          }}
        />
      )}
    </>
  );
}
