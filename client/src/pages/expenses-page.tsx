import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Expense } from "@shared/schema";
import { useRoute, useLocation } from "wouter";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ExpensesTable } from "@/components/expenses/expenses-table";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

export default function ExpensesPage() {
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [matchExpenseId] = useRoute("/expenses/:id");
  const [matchExpenseAction] = useRoute("/expenses/:id/:action");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const { data: expenses, isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });
  
  // Get expense ID from the URL if available
  const expenseId = matchExpenseAction?.params?.id || matchExpenseId?.params?.id || null;
  const action = matchExpenseAction?.params?.action || null;
  
  // If we have an expense ID in the URL, get that expense's data
  const editExpense = expenseId ? expenses?.find(e => e.id.toString() === expenseId) : undefined;
  
  const isEditing = action === "edit" && editExpense;
  const isViewing = action === "view" && editExpense;
  
  // Show form if adding, editing, or viewing an expense
  const showForm = isAddingExpense || isEditing || isViewing;
  
  // Calculate expense stats
  const calculateTotalExpenses = () => {
    if (!expenses || expenses.length === 0) return 0;
    return expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  };

  const calculateFixedExpenses = () => {
    if (!expenses || expenses.length === 0) return 0;
    return expenses
      .filter(expense => expense.type === "fixed")
      .reduce((sum, expense) => sum + Number(expense.amount), 0);
  };

  const calculateVariableExpenses = () => {
    if (!expenses || expenses.length === 0) return 0;
    return expenses
      .filter(expense => expense.type === "variable")
      .reduce((sum, expense) => sum + Number(expense.amount), 0);
  };
  
  // Count expenses by type
  const fixedCount = expenses?.filter(e => e.type === "fixed").length || 0;
  const variableCount = expenses?.filter(e => e.type === "variable").length || 0;
  
  return (
    <div>
      <PageHeader title={showForm ? (isEditing ? "Editar Despesa" : isViewing ? "Detalhes da Despesa" : "Nova Despesa") : "Despesas"}>
        {!showForm && (
          <PageHeader.Action>
            <Button onClick={() => setIsAddingExpense(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Despesa
            </Button>
          </PageHeader.Action>
        )}
      </PageHeader>
      
      {!showForm && (
        <>
          {/* Expense Summary Cards */}
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Despesas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(calculateTotalExpenses())}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Despesas Fixas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(calculateFixedExpenses())}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Despesas Variáveis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(calculateVariableExpenses())}</div>
              </CardContent>
            </Card>
          </div>
          
          {/* Expenses Table with Tabs */}
          <div className="mt-6">
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="fixed">Fixas ({fixedCount})</TabsTrigger>
                <TabsTrigger value="variable">Variáveis ({variableCount})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <ExpensesTable />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="fixed" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <ExpensesTable filter="fixed" />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="variable" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <ExpensesTable filter="variable" />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}
      
      {showForm && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="mb-4 flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAddingExpense(false);
                  navigate("/expenses");
                }}
              >
                Voltar
              </Button>
            </div>
            <ExpenseForm editExpense={isEditing ? editExpense : undefined} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
