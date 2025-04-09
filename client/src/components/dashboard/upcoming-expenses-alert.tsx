import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Expense } from '@shared/schema';
import { AlertCircle, ArrowRight, CalendarClock } from 'lucide-react';

export function UpcomingExpensesAlert() {
  const [upcomingExpenses, setUpcomingExpenses] = useState<Expense[]>([]);
  
  // Buscar todas as despesas
  const { data: expenses, isLoading } = useQuery<Expense[]>({
    queryKey: ['/api/expenses'],
  });
  
  // Filtrar despesas com vencimento nas próximas 24 horas
  useEffect(() => {
    if (expenses && expenses.length > 0) {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      
      const upcoming = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= now && expenseDate <= tomorrow;
      });
      
      setUpcomingExpenses(upcoming);
    }
  }, [expenses]);
  
  // Se não tiver despesas próximas ou estiver carregando, não mostrar nada
  if (isLoading || !upcomingExpenses.length) {
    return null;
  }
  
  return (
    <Card className="mb-6 border-amber-200 bg-amber-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-amber-800 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Despesas com vencimento próximo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {upcomingExpenses.map(expense => (
            <Alert key={expense.id} className="border-amber-200 bg-amber-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <AlertTitle className="flex items-center gap-2">
                    {expense.description}
                    <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 hover:bg-amber-200">
                      <CalendarClock className="mr-1 h-3 w-3" />
                      {new Date(expense.date).toLocaleDateString('pt-BR')}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription>
                    {formatCurrency(Number(expense.amount))} - {expense.category}
                  </AlertDescription>
                </div>
                <Link href={`/expenses/${expense.id}`}>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="mt-2 sm:mt-0 border-amber-200 bg-amber-100 text-amber-800 hover:bg-amber-200"
                  >
                    Ver Detalhes
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </Alert>
          ))}
          
          <div className="text-right">
            <Link href="/expenses">
              <Button variant="ghost" className="text-amber-800 hover:text-amber-900 hover:bg-amber-100">
                Ver todas as despesas
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}