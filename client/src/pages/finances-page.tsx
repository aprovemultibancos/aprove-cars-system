import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Financing } from "@shared/schema";
import { useRoute } from "wouter";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { FinancingTable } from "@/components/financing/financing-table";
import { FinancingForm } from "@/components/financing/financing-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

export default function FinancesPage() {
  const [isAddingFinancing, setIsAddingFinancing] = useState(false);
  const [matchFinancingId] = useRoute("/finances/:id");
  const [matchFinancingAction] = useRoute("/finances/:id/:action");
  const { toast } = useToast();
  
  const { data: financings, isLoading } = useQuery<Financing[]>({
    queryKey: ["/api/financings"],
  });
  
  // Get financing ID from the URL if available
  const financingId = matchFinancingId?.params?.id || matchFinancingAction?.params?.id;
  const action = matchFinancingAction?.params?.action;
  
  // If we have a financing ID in the URL, get that financing's data
  const editFinancing = financingId ? financings?.find(f => f.id.toString() === financingId) : undefined;
  
  const isEditing = action === "edit" && editFinancing;
  const isViewing = action === "view" && editFinancing;
  
  // Show form if adding, editing, or viewing a financing
  const showForm = isAddingFinancing || isEditing || isViewing;
  
  // Count financings by status - agora apenas 'analysis' e 'paid'
  const analysisCount = financings?.filter(f => 
    f.status === "analysis" || f.status === "approved" || f.status === "rejected"
  ).length || 0;
  const paidCount = financings?.filter(f => f.status === "paid").length || 0;
  
  // Calculate financing stats
  const calculateTotalValue = () => {
    if (!financings || financings.length === 0) return 0;
    return financings.reduce((sum, financing) => sum + Number(financing.assetValue), 0);
  };

  const calculateTotalProfit = () => {
    if (!financings || financings.length === 0) return 0;
    return financings.reduce((sum, financing) => {
      // Cálculo correto do lucro com retorno esperado
      const returnAmount = Number(financing.expectedReturn || 0);
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
      
      // Lucro = Retorno - ILA + Acessórios + Taxa - Comissão do agente - Comissão do vendedor
      return sum + (returnAmount - ilaAmount + accessoriesValue + feeAmount - agentComm - sellerComm);
    }, 0);
  };
  
  return (
    <div>
      <PageHeader title={showForm ? (isEditing ? "Editar Financiamento" : isViewing ? "Detalhes do Financiamento" : "Novo Financiamento") : "Financiamentos"}>
        {!showForm && (
          <PageHeader.Action>
            <Button onClick={() => setIsAddingFinancing(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Financiamento
            </Button>
          </PageHeader.Action>
        )}
      </PageHeader>
      
      {!showForm && (
        <>
          {/* Finance Summary Cards */}
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Financiado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(calculateTotalValue())}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Lucro Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(calculateTotalProfit())}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Propostas Ativas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analysisCount}</div>
              </CardContent>
            </Card>
          </div>
          
          {/* Financing Table with Tabs */}
          <div className="mt-6">
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="analysis">Em Análise ({analysisCount})</TabsTrigger>
                <TabsTrigger value="paid">Pagos ({paidCount})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <FinancingTable />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="analysis" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <FinancingTable />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="paid" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <FinancingTable />
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
            <FinancingForm editFinancing={isEditing ? editFinancing : undefined} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
