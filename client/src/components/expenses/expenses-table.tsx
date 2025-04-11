import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Expense, Personnel } from "@shared/schema";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, ArrowUpDown, FileEdit, Check, FileQuestion } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ExpenseViewModal } from "./expense-view-modal";

interface ExpensesTableProps {
  filter?: "fixed" | "variable";
}

// Tipo de status das despesas
type ExpenseStatus = 'paid' | 'pending';

export function ExpensesTable({ filter }: ExpensesTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expenseToDelete, setExpenseToDelete] = useState<number | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [expenseStatuses, setExpenseStatuses] = useState<Record<number, ExpenseStatus>>({});
  
  const { data: expenses, isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const { data: personnel, isLoading: personnelLoading } = useQuery<Personnel[]>({
    queryKey: ["/api/personnel"],
  });

  // Determina o status da despesa (padrão: A Vencer)
  const getExpenseStatus = (expense: Expense): ExpenseStatus => {
    // Se o status já foi definido pelo usuário, retorna esse status
    if (expenseStatuses[expense.id]) {
      return expenseStatuses[expense.id];
    }
    
    // Status padrão para qualquer nova despesa é 'A Vencer'
    return 'pending';
  };
  
  // Função para alternar o status de uma despesa
  const toggleExpenseStatus = (expenseId: number) => {
    setExpenseStatuses(prev => {
      const currentStatus = prev[expenseId] || 'pending';
      const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
      
      return {
        ...prev,
        [expenseId]: newStatus
      };
    });
  };

  // Filtra e ordena as despesas
  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    
    let result = [...expenses];
    
    // Filtrar por tipo (fixo ou variável) se solicitado
    if (filter) {
      result = result.filter(expense => expense.type === filter);
    }
    
    // Filtrar por status
    if (statusFilter !== 'all') {
      result = result.filter(expense => {
        return getExpenseStatus(expense) === statusFilter;
      });
    }
    
    // Ordenar por data
    result = result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
    
    return result;
  }, [expenses, filter, statusFilter, sortOrder, expenseStatuses]);

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
      header: ({ column }) => {
        return (
          <div className="flex items-center space-x-1">
            <span>Data</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="ml-2 h-8 data-[state=open]:bg-accent">
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortOrder('asc')}>
                  Data (crescente)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOrder('desc')}>
                  Data (decrescente)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = getExpenseStatus(row.original);
        
        if (status === 'paid') {
          return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Pago</Badge>;
        } else {
          return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">A Vencer</Badge>;
        }
      },
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
      id: "changeStatus",
      header: "Mudar Status",
      cell: ({ row }) => {
        const expense = row.original;
        const currentStatus = getExpenseStatus(expense);
        
        return (
          <Button
            variant="outline"
            size="sm"
            className={currentStatus === 'paid' 
              ? "bg-purple-100 border-purple-200 text-purple-800 hover:bg-purple-200" 
              : "bg-green-100 border-green-200 text-green-800 hover:bg-green-200"
            }
            onClick={() => toggleExpenseStatus(expense.id)}
          >
            {currentStatus === 'paid' ? (
              <>
                <FileQuestion className="h-4 w-4 mr-1" />
                A Vencer
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
      id: "actions",
      header: "Ações",
      cell: ({ row }) => {
        const expense = row.original;
        
        return (
          <div className="flex items-center justify-end space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedExpense(expense)}
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
    <>
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex flex-wrap gap-2">
          <Button 
            variant={statusFilter === 'all' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            Todas
          </Button>
          <Button 
            variant={statusFilter === 'paid' ? 'default' : 'outline'} 
            size="sm"
            className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200"
            onClick={() => setStatusFilter('paid')}
          >
            <Check className="h-4 w-4 mr-1" />
            Pagas
          </Button>
          <Button 
            variant={statusFilter === 'pending' ? 'default' : 'outline'} 
            size="sm"
            className="bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200"
            onClick={() => setStatusFilter('pending')}
          >
            <FileQuestion className="h-4 w-4 mr-1" />
            A Vencer
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant={sortOrder === 'asc' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setSortOrder('asc')}
          >
            Data ↑
          </Button>
          <Button 
            variant={sortOrder === 'desc' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setSortOrder('desc')}
          >
            Data ↓
          </Button>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={filteredExpenses} 
        searchKey="description"
        searchPlaceholder="Buscar despesas..."
      />
      
      {selectedExpense && (
        <ExpenseViewModal
          expense={selectedExpense}
          open={!!selectedExpense}
          onOpenChange={(open) => {
            if (!open) setSelectedExpense(null);
          }}
        />
      )}
    </>
  );
}