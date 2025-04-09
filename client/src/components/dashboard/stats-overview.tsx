import { BarChart3, DollarSign, CreditCard, Clock } from "lucide-react";
import { StatCard } from "../ui/stat-card";

interface StatsData {
  inventoryValue: string;
  monthlySales: string;
  financingTotal: string;
  totalProfit: string;
  inventoryTrend?: string;
  salesTrend?: string;
  financingTrend?: string;
  profitTrend?: string;
}

interface StatsOverviewProps {
  data: StatsData;
  isLoading?: boolean;
}

export function StatsOverview({ data, isLoading = false }: StatsOverviewProps) {
  if (isLoading) {
    return (
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Valor do Inventário"
        value={data.inventoryValue}
        icon={BarChart3}
        iconColor="bg-primary-500"
        trend={data.inventoryTrend ? {
          value: data.inventoryTrend,
          positive: !data.inventoryTrend.includes("-")
        } : undefined}
      />
      
      <StatCard
        title="Vendas do Mês"
        value={data.monthlySales}
        icon={DollarSign}
        iconColor="bg-green-600"
        trend={data.salesTrend ? {
          value: data.salesTrend,
          positive: !data.salesTrend.includes("-")
        } : undefined}
      />
      
      <StatCard
        title="Financiamentos"
        value={data.financingTotal}
        icon={CreditCard}
        iconColor="bg-blue-500"
        trend={data.financingTrend ? {
          value: data.financingTrend,
          positive: !data.financingTrend.includes("-")
        } : undefined}
      />
      
      <StatCard
        title="Lucro Total"
        value={data.totalProfit}
        icon={Clock}
        iconColor="bg-green-700"
        trend={data.profitTrend ? {
          value: data.profitTrend,
          positive: !data.profitTrend.includes("-")
        } : undefined}
      />
    </div>
  );
}
