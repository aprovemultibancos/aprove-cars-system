import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sale, Vehicle } from "@shared/schema";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Trash2 } from "lucide-react";
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
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SaleViewModal } from "./sale-view-modal";

interface SaleWithDetails extends Sale {
  vehicleName?: string;
  customerName?: string;
  sellerName?: string;
}

export function SalesTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saleToDelete, setSaleToDelete] = useState<number | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  
  const { data: sales, isLoading } = useQuery<SaleWithDetails[]>({
    queryKey: ["/api/sales"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/sales/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Venda removida",
        description: "A venda foi removida com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      setSaleToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao remover a venda",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (saleToDelete) {
      deleteMutation.mutate(saleToDelete);
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const columns: ColumnDef<SaleWithDetails>[] = [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "vehicleName",
      header: "Veículo",
      cell: ({ row }) => row.original.vehicleName || `Veículo #${row.original.vehicleId}`,
    },
    {
      accessorKey: "customerName",
      header: "Cliente",
      cell: ({ row }) => row.original.customerName || `Cliente #${row.original.customerId}`,
    },
    {
      accessorKey: "salePrice",
      header: "Valor",
      cell: ({ row }) => formatCurrency(Number(row.original.salePrice)),
    },
    {
      accessorKey: "saleDate",
      header: "Data",
      cell: ({ row }) => formatDate(row.original.saleDate),
    },
    {
      accessorKey: "paymentMethod",
      header: "Pagamento",
      cell: ({ row }) => {
        const methodMap: Record<string, string> = {
          cash: "Dinheiro",
          credit_card: "Cartão de Crédito",
          debit_card: "Cartão de Débito",
          bank_transfer: "Transferência",
          pix: "PIX",
          financing: "Financiamento"
        };
        
        return methodMap[row.original.paymentMethod] || row.original.paymentMethod;
      },
    },
    {
      accessorKey: "sellerName",
      header: "Vendedor",
      cell: ({ row }) => row.original.sellerName || `Vendedor #${row.original.sellerId}`,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const sale = row.original;
        
        return (
          <div className="flex items-center justify-end space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedSale(sale)}
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
                  onClick={() => setSaleToDelete(sale.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Excluir</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir esta venda?
                    Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setSaleToDelete(null)}>Cancelar</AlertDialogCancel>
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
        data={sales || []} 
        searchKey="vehicleName"
        searchPlaceholder="Buscar vendas..."
      />
      
      {selectedSale && (
        <SaleViewModal
          sale={selectedSale as any}
          open={!!selectedSale}
          onOpenChange={(open) => {
            if (!open) setSelectedSale(null);
          }}
        />
      )}
    </>
  );
}
