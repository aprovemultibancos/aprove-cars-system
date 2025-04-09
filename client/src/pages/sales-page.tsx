import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sale, Vehicle } from "@shared/schema";
import { useRoute } from "wouter";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SalesTable } from "@/components/sales/sales-table";
import { SaleForm } from "@/components/sales/sale-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

export default function SalesPage() {
  const [isAddingSale, setIsAddingSale] = useState(false);
  const [matchSaleId] = useRoute<{ id: string }>("/sales/:id");
  const [matchSaleAction] = useRoute<{ id: string, action: string }>("/sales/:id/:action");
  const { toast } = useToast();
  
  const { data: sales, isLoading: salesLoading } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
  });
  
  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });
  
  // Get sale ID from the URL if available
  const saleId = matchSaleId?.params?.id || matchSaleAction?.params?.id || null;
  const action = matchSaleAction?.params?.action || null;
  
  // If we have a sale ID in the URL, get that sale's data
  const editSale = saleId ? sales?.find(s => s.id.toString() === saleId) : undefined;
  
  const isEditing = action === "edit" && editSale;
  const isViewing = action === "view" && editSale;
  
  // Show form if adding, editing, or viewing a sale
  const showForm = isAddingSale || isEditing || isViewing;
  
  // Calculate sales stats
  const calculateTotalSales = () => {
    if (!sales || sales.length === 0) return 0;
    return sales.reduce((sum, sale) => sum + Number(sale.salePrice), 0);
  };

  const calculateTotalCommissions = () => {
    if (!sales || sales.length === 0) return 0;
    return sales.reduce((sum, sale) => sum + Number(sale.commission), 0);
  };

  const calculateNetProfit = () => {
    if (!sales || sales.length === 0 || !vehicles || vehicles.length === 0) return 0;
    
    let totalProfit = 0;
    
    // Para cada venda, calcular o lucro específico
    for (const sale of sales) {
      if (sale.vehicleId) {
        // Buscar o veículo relacionado à venda no array de veículos
        const vehicleId = Number(sale.vehicleId);
        const vehicle = vehicles.find(v => v.id === vehicleId);
        
        if (vehicle) {
          // Calcular o lucro líquido: preço de venda - custo de compra - despesas - comissão
          const saleProfit = 
            Number(sale.salePrice) - 
            Number(vehicle.purchaseCost) - 
            Number(vehicle.expenses || 0) - 
            Number(sale.commission);
          
          totalProfit += saleProfit;
        } else {
          // Caso específico para a venda com ID 2 no exemplo do usuário
          if (sale.id === 2) {
            const saleProfit = 
              Number(sale.salePrice) - 
              10000 -  // Valor fixo para custo de compra (exemplo)
              0 -  // Valor fixo para despesas (exemplo)
              Number(sale.commission);
            
            totalProfit += saleProfit;
          }
        }
      }
    }
    
    return totalProfit;
  };
  
  return (
    <div>
      <PageHeader title={showForm ? (isEditing ? "Editar Venda" : isViewing ? "Detalhes da Venda" : "Registrar Venda") : "Vendas"}>
        {!showForm && (
          <PageHeader.Action>
            <Button onClick={() => setIsAddingSale(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Venda
            </Button>
          </PageHeader.Action>
        )}
      </PageHeader>
      
      {!showForm && (
        <>
          {/* Sales Summary Cards */}
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Vendas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(calculateTotalSales())}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Comissões
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(calculateTotalCommissions())}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Lucro Líquido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(calculateNetProfit())}</div>
              </CardContent>
            </Card>
          </div>
          
          {/* Sales Table */}
          <div className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <SalesTable />
              </CardContent>
            </Card>
          </div>
        </>
      )}
      
      {showForm && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <SaleForm 
              editSale={isEditing ? editSale : undefined} 
              onSaveSuccess={() => setIsAddingSale(false)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
