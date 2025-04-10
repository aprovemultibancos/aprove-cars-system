import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Expense, Personnel } from "@shared/schema";
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

interface ExpensesTableProps {
  filter?: "fixed" | "variable";
}

export function ExpensesTable({ filter }: ExpensesTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expenseToDelete, setExpenseToDelete] = useState<number | null>(null);
  
  const { data: expenses, isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const { data: personnel, isLoading: personnelLoading } = useQuery<Personnel[]>({
    queryKey: ["/api/personnel"],
  });

  // Apply filter if provided
  const filteredExpenses = expenses 
    ? filter 
      ? expenses.filter(expense => expense.type === filter) 
      : expenses
    : [];

  const isLoading = expensesLoading || personnelLoading;

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/expenses/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Despesa removida",
        description: "A despesa foi removida com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setExpenseToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao remover a despesa",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (expenseToDelete) {
      deleteMutation.mutate(expenseToDelete);
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getPayeeName = (payeeId?: number) => {
    if (!payeeId || !personnel) return "—";
    
    const payee = personnel.find(p => p.id === payeeId);
    return payee ? payee.name : "—";
  };

  const columns: ColumnDef<Expense>[] = [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "description",
      header: "Descrição",
    },
    {
      accessorKey: "amount",
      header: "Valor",
      cell: ({ row }) => formatCurrency(Number(row.original.amount)),
    },
    {
      accessorKey: "date",
      header: "Data",
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: "category",
      header: "Categoria",
    },
    {
      accessorKey: "type",
      header: "Tipo",
      cell: ({ row }) => {
        const type = row.original.type;
        return type === "fixed" 
          ? <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Fixa</Badge>
          : <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Variável</Badge>;
      },
    },
    {
      accessorKey: "payeeId",
      header: "Beneficiário",
      cell: ({ row }) => getPayeeName(row.original.payeeId ? row.original.payeeId : undefined),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const expense = row.original;
        
        return (
          <div className="flex items-center justify-end space-x-2">
            <Link href={`/expenses/${expense.id}/view`}>
              <Button variant="ghost" size="icon">
                <Eye className="h-4 w-4" />
                <span className="sr-only">Ver</span>
              </Button>
            </Link>
            <Link href={`/expenses/${expense.id}/edit`}>
              <Button variant="ghost" size="icon">
                <span>Editar</span>
              </Button>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-red-500 hover:text-red-700"
                  onClick={() => setExpenseToDelete(expense.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Excluir</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir esta despesa?
                    Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setExpenseToDelete(null)}>Cancelar</AlertDialogCancel>
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
      data={filteredExpenses} 
      searchKey="description"
      searchPlaceholder="Buscar despesas..."
    />
  );
}
