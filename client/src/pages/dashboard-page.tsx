import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import { SalesChart } from "@/components/dashboard/chart-section";
import { FinancingChart } from "@/components/dashboard/chart-section";
import { RecentVehicles } from "@/components/dashboard/recent-vehicles";
import { RecentFinancing } from "@/components/dashboard/recent-financing";
import { UpcomingExpensesAlert } from "@/components/dashboard/upcoming-expenses-alert";
import { Vehicle, Financing, Customer, Personnel, Sale } from "@shared/schema";
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
  
  const { data: sales } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
  });
  
  // Calcular estatísticas reais baseadas nos dados do banco de dados
  const calculateStats = () => {
    // Cálculo do valor de inventário (veículos disponíveis)
    const availableVehicles = vehicles?.filter(v => v.status === "available") || [];
    const inventoryValue = availableVehicles.reduce((sum, vehicle) => sum + Number(vehicle.sellingPrice), 0);
    
    // Cálculo de vendas utilizando os dados de vendas reais
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    
    // Filtrar vendas do último mês
    const recentSales = sales?.filter(sale => {
      if (!sale.saleDate) return false;
      try {
        const saleDate = new Date(sale.saleDate);
        return saleDate >= lastMonthDate;
      } catch (e) {
        return false;
      }
    }) || [];
    
    const salesTotal = recentSales.reduce((sum, sale) => sum + Number(sale.salePrice || 0), 0);
    
    // Cálculo de financiamentos - usamos o valor correto
    const financingTotal = financings?.reduce((sum, f) => sum + Number(f.assetValue || 0), 0) || 0;
    
    // Cálculo dos retornos esperados dos financiamentos
    const expectedReturns = financings?.reduce((sum, f) => sum + Number(f.expectedReturn || 0), 0) || 0;
    
    // Cálculo do lucro das vendas de forma correta
    let salesProfit = 0;
    if (sales && vehicles) {
      // Para cada venda, calcular o lucro específico
      for (const sale of recentSales) {
        if (sale.vehicleId) {
          // Buscar o veículo relacionado à venda
          const vehicleId = Number(sale.vehicleId);
          const vehicle = vehicles.find(v => v.id === vehicleId);
          
          if (vehicle) {
            // Calcular o lucro líquido: preço de venda - custo de compra - despesas - comissão
            const saleProfit = 
              Number(sale.salePrice || 0) - 
              Number(vehicle.purchaseCost || 0) - 
              Number(vehicle.expenses || 0) - 
              Number(sale.commission || 0);
            
            salesProfit += saleProfit;
          }
        }
      }
    }
    
    // Cálculo do lucro dos financiamentos corretamente
    let financingProfit = 0;
    if (financings) {
      financingProfit = financings.reduce((sum, financing) => {
        // Retorno esperado
        const returnAmount = Number(financing.expectedReturn || 0);
        // Comissões
        const agentComm = Number(financing.agentCommission || 0);
        const sellerComm = Number(financing.sellerCommission || 0);
        
        // ILA: 25.5% do valor de retorno
        const ilaAmount = returnAmount * 0.255;
        
        // Acessórios (calculados a partir do percentual)
        const assetValue = Number(financing.assetValue || 0);
        const accessoriesPercentage = Number(financing.accessoriesPercentage || 0);
        const accessoriesValue = assetValue * (accessoriesPercentage / 100);
        
        // Taxa adicional
        const feeAmount = Number(financing.feeAmount || 0);
        
        // Lucro = Retorno - ILA + Acessórios + Taxa - Comissões
        return sum + (returnAmount - ilaAmount + accessoriesValue + feeAmount - agentComm - sellerComm);
      }, 0);
    }
    
    // Lucro total = Lucro das vendas + Lucro dos financiamentos
    const totalProfit = salesProfit + financingProfit;
    
    // Retorna os dados calculados
    return {
      inventoryValue: `R$ ${inventoryValue.toLocaleString('pt-BR')}`,
      monthlySales: `R$ ${salesTotal.toLocaleString('pt-BR')}`,
      financingTotal: `R$ ${financingTotal.toLocaleString('pt-BR')}`,
      totalProfit: `R$ ${totalProfit.toLocaleString('pt-BR')}`,
      inventoryTrend: availableVehicles.length > 0 ? `${availableVehicles.length} veículos` : "Sem dados",
      salesTrend: recentSales.length > 0 ? `${recentSales.length} vendas recentes` : "Sem dados",
      financingTrend: financings && financings.length > 0 ? `${financings.length} contratos` : "Sem dados",
      profitTrend: totalProfit > 0 ? "Positivo" : "Negativo"
    };
  };
  
  // Gerar dados reais de vendas mensais
  const generateSalesChartData = () => {
    // Se não tiver vendas, retorna array vazio
    if (!sales || sales.length === 0) return [];
    
    // Meses em português
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const currentMonth = new Date().getMonth();
    
    // Inicializa array com os últimos 6 meses
    const chartData: { month: string; sales: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12; // Garante que o índice seja positivo
      chartData.push({
        month: months[monthIndex],
        sales: 0
      });
    }
    
    // Processar dados de vendas
    sales.forEach(sale => {
      try {
        if (!sale.saleDate) return;
        
        // Converter a data para um objeto Date
        const saleDate = new Date(sale.saleDate);
        if (isNaN(saleDate.getTime())) return; // Ignora datas inválidas
        
        const monthIndex = saleDate.getMonth();
        const monthName = months[monthIndex];
        
        // Verificar se o mês está nos últimos 6 meses
        const chartEntry = chartData.find(entry => entry.month === monthName);
        if (chartEntry) {
          chartEntry.sales += Number(sale.salePrice || 0);
        }
      } catch (error) {
        console.error("Erro ao processar data de venda:", error);
      }
    });
    
    return chartData;
  };

  // Gerar dados reais de financiamentos por banco
  const generateFinancingChartData = () => {
    // Se não tiver financiamentos, retorna array vazio
    if (!financings || financings.length === 0) return [];
    
    // Agrupa financiamentos por banco
    const bankSummary = financings.reduce((acc, financing) => {
      const bank = financing.bank || "Outros";
      if (!acc[bank]) {
        acc[bank] = 0;
      }
      acc[bank] += Number(financing.assetValue || 0);
      return acc;
    }, {} as Record<string, number>);
    
    // Converte para formato do gráfico
    return Object.entries(bankSummary).map(([bank, value]) => ({
      bank,
      value
    }));
  };
  
  const salesChartData = generateSalesChartData();
  const financingChartData = generateFinancingChartData();
  
  // Prepare data for recent components
  const getRecentVehicles = () => {
    return vehicles?.slice(0, 3) || [];
  };
  
  const getRecentFinancings = () => {
    if (!financings) return [];
    
    return financings.slice(0, 3).map(financing => {
      // Não precisamos mais procurar o cliente, pois já temos o nome diretamente
      return {
        ...financing,
        // Criar um objeto customer simulado com o nome que já temos no financiamento
        customer: {
          name: financing.customerName,
          email: null
        },
        // Usar o agentName que já está no financiamento
        agentName: financing.agentName
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
          <div className="flex flex-col md:flex-row gap-2">
            <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRange)}>
              <SelectTrigger className="w-full md:w-[180px]">
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
              className="mobile-btn-lg"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </PageHeader.Action>
      </PageHeader>
      
      {/* Alerta de despesas próximas do vencimento */}
      <UpcomingExpensesAlert />
      
      {/* Stats Cards */}
      <div className="mt-4 md:mt-6">
        <StatsOverview 
          data={calculateStats()}
          isLoading={vehiclesLoading || financingsLoading}
        />
      </div>
      
      {/* Charts */}
      <div className="mt-6 md:mt-8 grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-2">
        <div className="dashboard-card">
          <SalesChart data={salesChartData} />
        </div>
        <div className="dashboard-card">
          <FinancingChart data={financingChartData} />
        </div>
      </div>
      
      {/* Recent Vehicles */}
      <div className="mt-6 md:mt-8">
        <RecentVehicles 
          vehicles={getRecentVehicles()}
          isLoading={vehiclesLoading}
        />
      </div>
      
      {/* Recent Financing */}
      <div className="mt-6 md:mt-8 mb-6 md:mb-8">
        <RecentFinancing 
          financings={getRecentFinancings()}
          isLoading={financingsLoading}
        />
      </div>
    </div>
  );
}