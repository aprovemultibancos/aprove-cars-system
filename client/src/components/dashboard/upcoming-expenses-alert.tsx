import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Expense } from "@shared/schema";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

export function UpcomingExpensesAlert() {
  const [upcomingExpenses, setUpcomingExpenses] = useState<Expense[]>([]);

  const { data: expenses, isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  useEffect(() => {
    if (!expenses) return;

    // Filtrar despesas que vencem dentro de 1 dia
    const today = new Date();
    // Definir horário para 00:00:00 para comparar apenas datas
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const filtered = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      expenseDate.setHours(0, 0, 0, 0);
      
      // Verifica se a data da despesa é hoje ou amanhã
      return expenseDate.getTime() >= today.getTime() && 
             expenseDate.getTime() <= tomorrow.getTime();
    });
    
    setUpcomingExpenses(filtered);
  }, [expenses]);

  if (isLoading || upcomingExpenses.length === 0) return null;

  return (
    <Alert className="mb-6 border-amber-500 bg-amber-50">
      <AlertCircle className="h-5 w-5 text-amber-500" />
      <AlertTitle className="text-amber-700">Despesas próximas do vencimento</AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-2">
          {upcomingExpenses.map(expense => (
            <div key={expense.id} className="flex items-center justify-between p-2 rounded bg-white">
              <div className="flex items-center">
                <span className="font-medium mr-2">{expense.description}</span>
                <Badge variant="outline" className="bg-amber-100 text-amber-800">
                  {new Date(expense.date).toLocaleDateString('pt-BR')}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-bold">{formatCurrency(Number(expense.amount))}</span>
                <Link href={`/expenses/${expense.id}/view`} className="text-blue-600 hover:underline text-sm">
                  Ver detalhes
                </Link>
              </div>
            </div>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
}