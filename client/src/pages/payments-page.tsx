import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Customer, Sale, User } from "@shared/schema";
import { PaymentForm } from "@/components/payments/payment-form";
import { PaymentList } from "@/components/payments/payment-list";
import { Loader2 } from "lucide-react";

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState("create");
  
  const { data: customers, isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });
  
  const { data: sales, isLoading: isLoadingSales } = useQuery<Sale[]>({
    queryKey: ["/api/sales"],
  });
  
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });
  
  const isLoading = isLoadingCustomers || isLoadingSales || isLoadingUsers;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div>
      <PageHeader title="Pagamentos" description="Gerencie pagamentos via boleto, pix e cartão de crédito com Asaas" />
      
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="mt-6"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="create">Criar Pagamento</TabsTrigger>
          <TabsTrigger value="list">Listar Pagamentos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="create" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Nova Cobrança</CardTitle>
              <CardDescription>
                Crie uma nova cobrança para seus clientes via boleto, PIX ou cartão de crédito
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentForm 
                customers={customers || []} 
                sales={sales || []} 
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="list" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Cobranças</CardTitle>
              <CardDescription>
                Visualize e gerencie todas as cobranças
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}