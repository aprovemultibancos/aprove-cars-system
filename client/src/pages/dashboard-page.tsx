import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import { SalesChart } from "@/components/dashboard/chart-section";
import { FinancingChart } from "@/components/dashboard/chart-section";
import { RecentVehicles } from "@/components/dashboard/recent-vehicles";
import { RecentFinancing } from "@/components/dashboard/recent-financing";
import { Vehicle, Financing, Customer, Personnel } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

type DateRange = '7days' | '30days' | '90days' | 'year';
type FinancingWithCustomer = Financing & { customer?: Customer; agentName?: string };

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30days');
  const { toast } = useToast();
  
  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });
  
  const { data: financings, isLoading: financingsLoading } = useQuery<Financing[]>({
    queryKey: ["/api/financings"],
  });
  
  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });
  
  const { data: personnel } = useQuery<Personnel[]>({
    queryKey: ["/api/personnel"],
  });
  
  // Calculate stats
  const calculateStats = () => {
    const availableVehicles = vehicles?.filter(v => v.status === "available") || [];
    const inventoryValue = availableVehicles.reduce((sum, vehicle) => sum + Number(vehicle.sellingPrice), 0);
    
    // This would typically be filtered by date range
    const monthlySales = 325400;
    const financingTotal = financings?.reduce((sum, f) => sum + Number(f.releasedAmount), 0) || 0;
    const totalProfit = 183450;
    
    return {
      inventoryValue: `R$ ${inventoryValue.toLocaleString('pt-BR')}`,
      monthlySales: `R$ ${monthlySales.toLocaleString('pt-BR')}`,
      financingTotal: `R$ ${financingTotal.toLocaleString('pt-BR')}`,
      totalProfit: `R$ ${totalProfit.toLocaleString('pt-BR')}`,
      inventoryTrend: "12% este mês",
      salesTrend: "8% sobre Abril",
      financingTrend: "15% este mês",
      profitTrend: "-5% sobre Abril"
    };
  };
  
  // Sample chart data - in a real app, this would come from an API
  const salesChartData = [
    { month: "Jan", sales: 210000 },
    { month: "Fev", sales: 190000 },
    { month: "Mar", sales: 250000 },
    { month: "Abr", sales: 300000 },
    { month: "Mai", sales: 325400 },
    { month: "Jun", sales: 0 },
  ];
  
  const financingChartData = [
    { bank: "Banco do Brasil", value: 350000 },
    { bank: "Caixa", value: 250000 },
    { bank: "Santander", value: 120000 },
    { bank: "Itaú", value: 80000 },
    { bank: "Outros", value: 50000 },
  ];
  
  // Prepare data for recent components
  const getRecentVehicles = () => {
    return vehicles?.slice(0, 3) || [];
  };
  
  const getRecentFinancings = () => {
    if (!financings || !customers || !personnel) return [];
    
    return financings.slice(0, 3).map(financing => {
      const customer = customers.find(c => c.id === financing.customerId);
      const agent = personnel.find(p => p.id === financing.agentId);
      
      return {
        ...financing,
        customer,
        agentName: agent?.name
      } as FinancingWithCustomer;
    });
  };
  
  // Função para exportar dados do dashboard
  const exportDashboardData = () => {
    try {
      // Preparar dados para exportação
      const stats = calculateStats();
      const rangeLabel = dateRange === '7days' ? 'Últimos 7 dias' : 
                        dateRange === '30days' ? 'Últimos 30 dias' : 
                        dateRange === '90days' ? 'Últimos 90 dias' : 'Este ano';
      
      // Criar string CSV
      let csvContent = "Aprove - Relatório do Dashboard\n";
      csvContent += `Período: ${rangeLabel}\n`;
      csvContent += `Data de geração: ${new Date().toLocaleDateString('pt-BR')}\n\n`;
      
      // Adicionar estatísticas
      csvContent += "Estatísticas\n";
      csvContent += `Valor do Inventário,${stats.inventoryValue.replace('R$ ', '')}\n`;
      csvContent += `Vendas do Mês,${stats.monthlySales.replace('R$ ', '')}\n`;
      csvContent += `Financiamentos,${stats.financingTotal.replace('R$ ', '')}\n`;
      csvContent += `Lucro Total,${stats.totalProfit.replace('R$ ', '')}\n\n`;
      
      // Adicionar dados de vendas
      csvContent += "Vendas por Mês\n";
      csvContent += "Mês,Valor\n";
      salesChartData.forEach(item => {
        csvContent += `${item.month},${item.sales}\n`;
      });
      csvContent += "\n";
      
      // Adicionar dados de financiamento
      csvContent += "Financiamentos por Banco\n";
      csvContent += "Banco,Valor\n";
      financingChartData.forEach(item => {
        csvContent += `${item.bank},${item.value}\n`;
      });
      
      // Criar um blob e fazer o download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `dashboard-aprove-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Exportação concluída",
        description: "Os dados foram exportados com sucesso.",
        variant: "default",
      });
    } catch (error) {
      console.error("Erro ao exportar dados:", error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os dados. Tente novamente.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div>
      <PageHeader title="Dashboard">
        <PageHeader.Action>
          <div className="flex space-x-2">
            <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRange)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Últimos 7 dias</SelectItem>
                <SelectItem value="30days">Últimos 30 dias</SelectItem>
                <SelectItem value="90days">Últimos 90 dias</SelectItem>
                <SelectItem value="year">Este ano</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              onClick={exportDashboardData}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </PageHeader.Action>
      </PageHeader>
      
      {/* Stats Cards */}
      <StatsOverview 
        data={calculateStats()}
        isLoading={vehiclesLoading || financingsLoading}
      />
      
      {/* Charts */}
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <SalesChart data={salesChartData} />
        <FinancingChart data={financingChartData} />
      </div>
      
      {/* Recent Vehicles */}
      <div className="mt-8">
        <RecentVehicles 
          vehicles={getRecentVehicles()}
          isLoading={vehiclesLoading}
        />
      </div>
      
      {/* Recent Financing */}
      <div className="mt-8 mb-8">
        <RecentFinancing 
          financings={getRecentFinancings()}
          isLoading={financingsLoading}
        />
      </div>
    </div>
  );
}