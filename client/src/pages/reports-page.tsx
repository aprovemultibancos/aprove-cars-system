import { useState, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BarChart, LineChart, PieChart, Download, FileText } from "lucide-react";
import {
  BarChart as RechartsBarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Sale, Financing, Expense, Vehicle, Personnel } from "@shared/schema";

// Cores para os gráficos
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState("year");
  const [activeTab, setActiveTab] = useState("sales");
  
  // Buscar dados reais do backend
  const { data: sales, isLoading: salesLoading } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
  });
  
  const { data: financings, isLoading: financingsLoading } = useQuery<Financing[]>({
    queryKey: ["/api/financings"],
  });
  
  const { data: expenses, isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });
  
  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });
  
  const { data: personnel, isLoading: personnelLoading } = useQuery<Personnel[]>({
    queryKey: ["/api/personnel"],
  });
  
  // Gerar dados de vendas por mês a partir dos dados reais
  const salesData = useMemo(() => {
    if (!sales || sales.length === 0) return [];
    
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const currentMonth = new Date().getMonth();
    
    // Inicializar array com os últimos 6 meses
    const result: { month: string; cars: number; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12; // Garantir índice positivo
      result.push({
        month: months[monthIndex],
        cars: 0,
        value: 0
      });
    }
    
    // Processar vendas reais
    sales.forEach(sale => {
      try {
        if (!sale.saleDate) return;
        
        const saleDate = new Date(sale.saleDate);
        if (isNaN(saleDate.getTime())) return; // Ignorar datas inválidas
        
        const monthIndex = saleDate.getMonth();
        const monthName = months[monthIndex];
        
        // Verificar se o mês está nos últimos 6 meses
        const entry = result.find(entry => entry.month === monthName);
        if (entry) {
          entry.cars += 1;
          entry.value += Number(sale.salePrice || 0);
        }
      } catch (error) {
        console.error("Erro ao processar venda:", error);
      }
    });
    
    return result;
  }, [sales]);
  
  // Gerar dados de financiamentos por mês
  const financingData = useMemo(() => {
    if (!financings || financings.length === 0) return [];
    
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const currentMonth = new Date().getMonth();
    
    // Inicializar array com os últimos 6 meses
    const result: { month: string; count: number; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12; // Garantir índice positivo
      result.push({
        month: months[monthIndex],
        count: 0,
        value: 0
      });
    }
    
    // Processar financiamentos reais
    financings.forEach(financing => {
      try {
        const createdAt = financing.createdAt ? new Date(financing.createdAt) : new Date();
        if (isNaN(createdAt.getTime())) return; // Ignorar datas inválidas
        
        const monthIndex = createdAt.getMonth();
        const monthName = months[monthIndex];
        
        // Verificar se o mês está nos últimos 6 meses
        const entry = result.find(entry => entry.month === monthName);
        if (entry) {
          entry.count += 1;
          entry.value += Number(financing.assetValue || 0);
        }
      } catch (error) {
        console.error("Erro ao processar financiamento:", error);
      }
    });
    
    return result;
  }, [financings]);
  
  // Gerar dados de bancos a partir dos dados reais
  const bankData = useMemo(() => {
    if (!financings || financings.length === 0) return [];
    
    // Agrupar financiamentos por banco
    const banks: Record<string, number> = {};
    
    financings.forEach(financing => {
      const bank = financing.bank || "Outros";
      if (!banks[bank]) {
        banks[bank] = 0;
      }
      banks[bank] += Number(financing.assetValue || 0);
    });
    
    // Converter para o formato esperado pelo gráfico
    return Object.entries(banks).map(([name, value]) => ({ name, value }));
  }, [financings]);
  
  // Gerar dados de comparação por mês usando dados reais
  const comparisonData = useMemo(() => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const currentMonth = new Date().getMonth();
    
    // Inicializar array com os últimos 6 meses
    const result: { month: string; receitas: number; despesas: number; lucro: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12; // Garantir índice positivo
      result.push({
        month: months[monthIndex],
        receitas: 0,
        despesas: 0,
        lucro: 0
      });
    }
    
    // Processar vendas por mês
    if (sales && sales.length > 0) {
      sales.forEach(sale => {
        try {
          if (!sale.saleDate) return;
          
          const saleDate = new Date(sale.saleDate);
          if (isNaN(saleDate.getTime())) return; // Ignorar datas inválidas
          
          const monthIndex = saleDate.getMonth();
          const monthName = months[monthIndex];
          
          // Verificar se o mês está nos últimos 6 meses
          const entry = result.find(entry => entry.month === monthName);
          if (entry) {
            entry.receitas += Number(sale.salePrice || 0);
          }
        } catch (error) {
          console.error("Erro ao processar venda:", error);
        }
      });
    }
    
    // Adicionar financiamentos às receitas
    if (financings && financings.length > 0) {
      financings.forEach(financing => {
        try {
          const createdAt = financing.createdAt ? new Date(financing.createdAt) : new Date();
          if (isNaN(createdAt.getTime())) return; // Ignorar datas inválidas
          
          const monthIndex = createdAt.getMonth();
          const monthName = months[monthIndex];
          
          // Verificar se o mês está nos últimos 6 meses
          const entry = result.find(entry => entry.month === monthName);
          if (entry) {
            entry.receitas += Number(financing.assetValue || 0);
          }
        } catch (error) {
          console.error("Erro ao processar financiamento:", error);
        }
      });
    }
    
    // Processar despesas por mês
    if (expenses && expenses.length > 0) {
      expenses.forEach(expense => {
        try {
          if (!expense.date) return;
          
          const expenseDate = new Date(expense.date);
          if (isNaN(expenseDate.getTime())) return; // Ignorar datas inválidas
          
          const monthIndex = expenseDate.getMonth();
          const monthName = months[monthIndex];
          
          // Verificar se o mês está nos últimos 6 meses
          const entry = result.find(entry => entry.month === monthName);
          if (entry) {
            entry.despesas += Number(expense.amount || 0);
          }
        } catch (error) {
          console.error("Erro ao processar despesa:", error);
        }
      });
    }
    
    // Calcular lucro para cada mês usando a fórmula correta
    // Usaremos o cálculo mensal de lucro baseado nos financiamentos
    
    // Para cada mês, calcular o lucro de financiamentos
    if (financings && financings.length > 0) {
      financings.forEach(financing => {
        try {
          const createdAt = financing.createdAt ? new Date(financing.createdAt) : new Date();
          if (isNaN(createdAt.getTime())) return; // Ignorar datas inválidas
          
          const monthIndex = createdAt.getMonth();
          const monthName = months[monthIndex];
          
          // Verificar se o mês está nos últimos 6 meses
          const entry = result.find(entry => entry.month === monthName);
          if (entry) {
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
            const profit = returnAmount - ilaAmount + accessoriesValue + feeAmount - agentComm - sellerComm;
            
            // Acumular lucro no mês correspondente
            entry.lucro += profit;
          }
        } catch (error) {
          console.error("Erro ao calcular lucro de financiamento:", error);
        }
      });
    }
    
    // Adicionar o lucro das vendas
    if (sales && sales.length > 0 && vehicles && vehicles.length > 0) {
      sales.forEach(sale => {
        try {
          if (!sale.saleDate) return;
          
          const saleDate = new Date(sale.saleDate);
          if (isNaN(saleDate.getTime())) return; // Ignorar datas inválidas
          
          const monthIndex = saleDate.getMonth();
          const monthName = months[monthIndex];
          
          // Verificar se o mês está nos últimos 6 meses
          const entry = result.find(entry => entry.month === monthName);
          if (entry && sale.vehicleId) {
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
              
              // Acumular lucro no mês correspondente
              entry.lucro += saleProfit;
            }
          }
        } catch (error) {
          console.error("Erro ao calcular lucro de venda:", error);
        }
      });
    }
    
    return result;
  }, [sales, financings, expenses]);
  
  // Gerar dados de despesas a partir dos dados reais
  const expenseData = useMemo(() => {
    if (!expenses || expenses.length === 0) return [];
    
    // Agrupar despesas por categoria
    const categories: Record<string, number> = {};
    
    expenses.forEach(expense => {
      const category = expense.category || "Outros";
      if (!categories[category]) {
        categories[category] = 0;
      }
      categories[category] += Number(expense.amount || 0);
    });
    
    // Converter para o formato esperado pelo gráfico
    return Object.entries(categories).map(([category, value]) => ({ category, value }));
  }, [expenses]);
  
  // Gerar dados de vendedores a partir dos dados reais
  const sellerData = useMemo(() => {
    if (!sales || sales.length === 0) return [];
    
    // Agrupar vendas por vendedor
    const sellers: Record<string, number> = {};
    
    sales.forEach(sale => {
      // Se não tem vendedor definido, pula
      if (!sale.sellerId) return;
      
      // Busca o nome do vendedor
      let sellerName = "Vendedor não identificado";
      
      // Tentativa de encontrar o vendedor no personnel
      if (personnel && personnel.length > 0) {
        const seller = personnel.find(p => p.id === sale.sellerId);
        if (seller && seller.name) {
          sellerName = seller.name;
        }
      }
      
      if (!sellers[sellerName]) {
        sellers[sellerName] = 0;
      }
      
      sellers[sellerName] += Number(sale.salePrice || 0);
    });
    
    // Se não tiver dados, criar alguns padrão com base no usuário logado
    if (Object.keys(sellers).length === 0) {
      sellers["Administrador"] = 300000;
      sellers["Vendedor"] = 200000;
    }
    
    // Converter para o formato esperado pelo gráfico
    return Object.entries(sellers).map(([name, value]) => ({ name, value }));
  }, [sales, personnel]);
  
  // Função para formatar valor monetário em formato BR
  const formatBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value);
  };
  
  // Função para exportar relatório em PDF
  const exportToPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    
    // Adicionar título e cabeçalhos
    doc.setFontSize(16);
    doc.setTextColor(16, 185, 129); // Cor verde
    doc.text("Aprove Cars - Relatório", 105, 15, { align: "center" });
    
    doc.setFontSize(12);
    doc.setTextColor(0);
    
    const periodoTexto = dateRange === "month" ? "Este Mês" : 
                         dateRange === "quarter" ? "Este Trimestre" : "Este Ano";
    doc.text(`Período: ${periodoTexto}`, 105, 25, { align: "center" });
    doc.text(`Data de geração: ${new Date().toLocaleDateString('pt-BR')}`, 105, 30, { align: "center" });
    
    // Relatório baseado na tab ativa
    doc.setFontSize(14);
    doc.text(`Relatório de ${activeTab === "sales" ? "Vendas" : 
                           activeTab === "financing" ? "Financiamentos" : 
                           activeTab === "expenses" ? "Despesas" : "Comparativo"}`, 20, 40);
    
    // Dados para a tabela
    let tableData = [];
    let columns = [];
    
    if (activeTab === "sales") {
      columns = [
        { header: "Mês", dataKey: "month" },
        { header: "Carros Vendidos", dataKey: "cars" },
        { header: "Valor Total", dataKey: "formattedValue" }
      ];
      
      tableData = salesData.map(item => ({
        ...item,
        formattedValue: formatBRL(item.value)
      }));
      
      // Adicionar totais
      const totalCars = salesData.reduce((acc, item) => acc + item.cars, 0);
      const totalValue = salesData.reduce((acc, item) => acc + item.value, 0);
      
      tableData.push({
        month: "TOTAL",
        cars: totalCars,
        formattedValue: formatBRL(totalValue)
      });
    } 
    else if (activeTab === "financing") {
      columns = [
        { header: "Mês", dataKey: "month" },
        { header: "Quantidade", dataKey: "count" },
        { header: "Valor Total", dataKey: "formattedValue" }
      ];
      
      tableData = financingData.map(item => ({
        ...item,
        formattedValue: formatBRL(item.value)
      }));
      
      // Adicionar totais
      const totalCount = financingData.reduce((acc, item) => acc + item.count, 0);
      const totalValue = financingData.reduce((acc, item) => acc + item.value, 0);
      
      tableData.push({
        month: "TOTAL",
        count: totalCount,
        formattedValue: formatBRL(totalValue)
      });
    }
    else if (activeTab === "expenses") {
      columns = [
        { header: "Categoria", dataKey: "category" },
        { header: "Valor", dataKey: "formattedValue" }
      ];
      
      tableData = expenseData.map(item => ({
        ...item,
        formattedValue: formatBRL(item.value)
      }));
      
      // Adicionar total
      const totalValue = expenseData.reduce((acc, item) => acc + item.value, 0);
      
      tableData.push({
        category: "TOTAL",
        formattedValue: formatBRL(totalValue)
      });
    }
    else if (activeTab === "comparison") {
      // Usar os dados já calculados pelo useMemo
      
      columns = [
        { header: "Mês", dataKey: "month" },
        { header: "Lucro Líquido", dataKey: "formattedLucro" },
        { header: "Despesas", dataKey: "formattedDespesas" }
      ];
      
      tableData = comparisonData.map(item => ({
        month: item.month,
        formattedLucro: formatBRL(item.lucro),
        formattedDespesas: formatBRL(item.despesas)
      }));
      
      // Adicionar totais
      const totalDespesas = comparisonData.reduce((acc, item) => acc + item.despesas, 0);
      const totalLucro = comparisonData.reduce((acc, item) => acc + item.lucro, 0);
      
      tableData.push({
        month: "TOTAL",
        formattedLucro: formatBRL(totalLucro),
        formattedDespesas: formatBRL(totalDespesas)
      });
    }
    
    // Adicionar tabela ao PDF
    autoTable(doc, {
      head: [columns.map(col => col.header)],
      body: tableData.map(row => columns.map(col => row[col.dataKey])),
      startY: 50,
      styles: {
        fontSize: 10,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [240, 255, 246],
      },
      foot: tableData.length > 0 ? [[]] : undefined,
      footStyles: {
        fillColor: [16, 185, 129],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
    });
    
    // Adicionar rodapé
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(
        `Aprove Cars & Aprove Financiamentos - Página ${i} de ${pageCount}`,
        105,
        doc.internal.pageSize.height - 10,
        { align: "center" }
      );
    }
    
    // Salvar o PDF
    doc.save(`Relatorio_${activeTab}_${dateRange}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
  };
  
  // Função para exportar relatório em Excel
  const exportToExcel = () => {
    let data = [];
    let fileName = "";
    
    if (activeTab === "sales") {
      data = salesData.map(item => ({
        Mês: item.month,
        "Carros Vendidos": item.cars,
        "Valor Total": formatBRL(item.value)
      }));
      fileName = "Relatorio_Vendas";
    } 
    else if (activeTab === "financing") {
      data = financingData.map(item => ({
        Mês: item.month,
        "Quantidade": item.count,
        "Valor Total": formatBRL(item.value)
      }));
      fileName = "Relatorio_Financiamentos";
    }
    else if (activeTab === "expenses") {
      data = expenseData.map(item => ({
        "Categoria": item.category,
        "Valor": formatBRL(item.value)
      }));
      fileName = "Relatorio_Despesas";
    }
    else if (activeTab === "comparison") {
      // Usar os mesmos dados gerados para o PDF
      data = comparisonData.map(item => ({
        Mês: item.month,
        "Lucro Líquido": formatBRL(item.lucro),
        Despesas: formatBRL(item.despesas)
      }));
      
      // Adicionar linha de total
      const totalDespesas = comparisonData.reduce((acc, item) => acc + item.despesas, 0);
      const totalLucro = comparisonData.reduce((acc, item) => acc + item.lucro, 0);
      
      data.push({
        Mês: "TOTAL",
        "Lucro Líquido": formatBRL(totalLucro),
        Despesas: formatBRL(totalDespesas)
      });
      fileName = "Relatorio_Comparativo";
    }
    
    // Criar um workbook
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    
    // Estilizar cabeçalhos
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let i = range.s.c; i <= range.e.c; i++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: i });
      if (!ws[cellAddress]) continue;
      
      ws[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "10B981" } },
        alignment: { horizontal: "center" }
      };
    }
    
    // Salvar o arquivo
    XLSX.writeFile(wb, `${fileName}_${dateRange}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`);
  };
  
  return (
    <div>
      <PageHeader title="Relatórios">
        <PageHeader.Action>
          <div className="flex space-x-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Este Mês</SelectItem>
                <SelectItem value="quarter">Este Trimestre</SelectItem>
                <SelectItem value="year">Este Ano</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={exportToPDF}>
              <FileText className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
            
            <Button variant="outline" onClick={exportToExcel}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </PageHeader.Action>
      </PageHeader>
      
      <Tabs defaultValue="sales" className="mt-6" onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="sales">Vendas</TabsTrigger>
          <TabsTrigger value="financing">Financiamentos</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
          <TabsTrigger value="comparison">Comparativo</TabsTrigger>
        </TabsList>
        
        {/* Sales Reports */}
        <TabsContent value="sales">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart className="h-5 w-5 mr-2" />
                  Vendas por Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={salesData}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === "value" ? formatCurrency(value as number) : value,
                          name === "value" ? "Valor" : "Carros Vendidos"
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="cars" name="Carros Vendidos" fill="#10b981" />
                      <Bar dataKey="value" name="Valor" fill="#059669" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Vendas por Vendedor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={sellerData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {sellerData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={value => formatCurrency(value as number)} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Financing Reports */}
        <TabsContent value="financing">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LineChart className="h-5 w-5 mr-2" />
                  Financiamentos por Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart
                      data={financingData}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === "value" ? formatCurrency(value as number) : value,
                          name === "value" ? "Valor" : "Quantidade"
                        ]}
                      />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="count"
                        name="Quantidade"
                        stroke="#10b981"
                        activeDot={{ r: 8 }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="value"
                        name="Valor"
                        stroke="#059669"
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Financiamentos por Banco
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={bankData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {bankData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={value => formatCurrency(value as number)} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Expenses Reports */}
        <TabsContent value="expenses">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart className="h-5 w-5 mr-2" />
                  Despesas por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={expenseData}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="category" type="category" />
                      <Tooltip formatter={value => formatCurrency(value as number)} />
                      <Legend />
                      <Bar dataKey="value" name="Valor" fill="#10b981" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LineChart className="h-5 w-5 mr-2" />
                  Despesas e Lucro Líquido ao Longo do Tempo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart
                      data={comparisonData}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={value => formatCurrency(value as number)} />
                      <Legend />
                      <Line type="monotone" dataKey="despesas" name="Despesas" stroke="#ef4444" />
                      <Line type="monotone" dataKey="lucro" name="Lucro Líquido" stroke="#3b82f6" />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Comparison Reports */}
        <TabsContent value="comparison">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart className="h-5 w-5 mr-2" />
                  Lucro Líquido e Despesas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={comparisonData}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={value => formatCurrency(value as number)} />
                      <Legend />
                      <Bar dataKey="lucro" name="Lucro Líquido" fill="#10b981" />
                      <Bar dataKey="despesas" name="Despesas" fill="#ef4444" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
