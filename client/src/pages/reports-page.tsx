import { useState, useRef } from "react";
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

// Sample data for charts
const salesData = [
  { month: "Jan", cars: 10, value: 400000 },
  { month: "Fev", cars: 12, value: 450000 },
  { month: "Mar", cars: 15, value: 600000 },
  { month: "Abr", cars: 18, value: 700000 },
  { month: "Mai", cars: 16, value: 650000 },
  { month: "Jun", cars: 20, value: 800000 },
];

const financingData = [
  { month: "Jan", count: 8, value: 300000 },
  { month: "Fev", count: 10, value: 380000 },
  { month: "Mar", count: 12, value: 450000 },
  { month: "Abr", count: 15, value: 580000 },
  { month: "Mai", count: 13, value: 500000 },
  { month: "Jun", count: 17, value: 650000 },
];

const bankData = [
  { name: "Banco do Brasil", value: 350000 },
  { name: "Caixa", value: 250000 },
  { name: "Santander", value: 180000 },
  { name: "Itaú", value: 120000 },
  { name: "Outros", value: 80000 },
];

const expenseData = [
  { category: "Salários", value: 180000 },
  { category: "Comissões", value: 120000 },
  { category: "Aluguel", value: 50000 },
  { category: "Marketing", value: 35000 },
  { category: "Operacional", value: 45000 },
  { category: "Outros", value: 30000 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState("year");
  const [activeTab, setActiveTab] = useState("sales");
  
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
      const comparisonData = [
        { month: "Jan", receitas: 400000, despesas: 165000, lucro: 235000 },
        { month: "Fev", receitas: 450000, despesas: 172000, lucro: 278000 },
        { month: "Mar", receitas: 600000, despesas: 173000, lucro: 427000 },
        { month: "Abr", receitas: 700000, despesas: 180000, lucro: 520000 },
        { month: "Mai", receitas: 650000, despesas: 180000, lucro: 470000 },
        { month: "Jun", receitas: 800000, despesas: 190000, lucro: 610000 },
      ];
      
      columns = [
        { header: "Mês", dataKey: "month" },
        { header: "Receitas", dataKey: "formattedReceitas" },
        { header: "Despesas", dataKey: "formattedDespesas" },
        { header: "Lucro", dataKey: "formattedLucro" }
      ];
      
      tableData = comparisonData.map(item => ({
        month: item.month,
        formattedReceitas: formatBRL(item.receitas),
        formattedDespesas: formatBRL(item.despesas),
        formattedLucro: formatBRL(item.lucro)
      }));
      
      // Adicionar totais
      const totalReceitas = comparisonData.reduce((acc, item) => acc + item.receitas, 0);
      const totalDespesas = comparisonData.reduce((acc, item) => acc + item.despesas, 0);
      const totalLucro = comparisonData.reduce((acc, item) => acc + item.lucro, 0);
      
      tableData.push({
        month: "TOTAL",
        formattedReceitas: formatBRL(totalReceitas),
        formattedDespesas: formatBRL(totalDespesas),
        formattedLucro: formatBRL(totalLucro)
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
      data = [
        { Mês: "Jan", Receitas: formatBRL(400000), Despesas: formatBRL(165000), Lucro: formatBRL(235000) },
        { Mês: "Fev", Receitas: formatBRL(450000), Despesas: formatBRL(172000), Lucro: formatBRL(278000) },
        { Mês: "Mar", Receitas: formatBRL(600000), Despesas: formatBRL(173000), Lucro: formatBRL(427000) },
        { Mês: "Abr", Receitas: formatBRL(700000), Despesas: formatBRL(180000), Lucro: formatBRL(520000) },
        { Mês: "Mai", Receitas: formatBRL(650000), Despesas: formatBRL(180000), Lucro: formatBRL(470000) },
        { Mês: "Jun", Receitas: formatBRL(800000), Despesas: formatBRL(190000), Lucro: formatBRL(610000) },
      ];
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
                        data={[
                          { name: "Ana Silva", value: 300000 },
                          { name: "Bruno Costa", value: 250000 },
                          { name: "Carlos Oliveira", value: 200000 },
                          { name: "Débora Melo", value: 150000 },
                        ]}
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
                  Despesas ao Longo do Tempo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart
                      data={[
                        { month: "Jan", fixed: 120000, variable: 45000 },
                        { month: "Fev", fixed: 120000, variable: 52000 },
                        { month: "Mar", fixed: 125000, variable: 48000 },
                        { month: "Abr", fixed: 125000, variable: 55000 },
                        { month: "Mai", fixed: 130000, variable: 50000 },
                        { month: "Jun", fixed: 130000, variable: 60000 },
                      ]}
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
                      <Line type="monotone" dataKey="fixed" name="Fixas" stroke="#10b981" />
                      <Line type="monotone" dataKey="variable" name="Variáveis" stroke="#059669" />
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
                  Receitas vs. Despesas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={[
                        { month: "Jan", receitas: 400000, despesas: 165000, lucro: 235000 },
                        { month: "Fev", receitas: 450000, despesas: 172000, lucro: 278000 },
                        { month: "Mar", receitas: 600000, despesas: 173000, lucro: 427000 },
                        { month: "Abr", receitas: 700000, despesas: 180000, lucro: 520000 },
                        { month: "Mai", receitas: 650000, despesas: 180000, lucro: 470000 },
                        { month: "Jun", receitas: 800000, despesas: 190000, lucro: 610000 },
                      ]}
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
                      <Bar dataKey="receitas" name="Receitas" fill="#10b981" />
                      <Bar dataKey="despesas" name="Despesas" fill="#ef4444" />
                      <Bar dataKey="lucro" name="Lucro" fill="#3b82f6" />
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
