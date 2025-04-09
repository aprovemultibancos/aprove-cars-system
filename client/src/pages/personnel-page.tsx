import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Personnel } from "@shared/schema";
import { useRoute } from "wouter";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { PersonnelTable } from "@/components/personnel/personnel-table";
import { PersonnelForm } from "@/components/personnel/personnel-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function PersonnelPage() {
  const [isAddingPersonnel, setIsAddingPersonnel] = useState(false);
  const [matchPersonnelId] = useRoute("/personnel/:id");
  const [matchPersonnelAction] = useRoute("/personnel/:id/:action");
  const { toast } = useToast();
  
  const { data: personnel, isLoading } = useQuery<Personnel[]>({
    queryKey: ["/api/personnel"],
  });
  
  // Get personnel ID from the URL if available
  const personnelId = matchPersonnelId?.params?.id || matchPersonnelAction?.params?.id;
  const action = matchPersonnelAction?.params?.action;
  
  // If we have a personnel ID in the URL, get that person's data
  const editPersonnel = personnelId ? personnel?.find(p => p.id.toString() === personnelId) : undefined;
  
  const isEditing = action === "edit" && editPersonnel;
  const isViewing = action === "view" && editPersonnel;
  
  // Show form if adding, editing, or viewing a person
  const showForm = isAddingPersonnel || isEditing || isViewing;
  
  // Count personnel by type
  const employeeCount = personnel?.filter(p => p.type === "employee").length || 0;
  const agentCount = personnel?.filter(p => p.type === "agent").length || 0;
  const dealerCount = personnel?.filter(p => p.type === "dealer").length || 0;
  
  return (
    <div>
      <PageHeader title={showForm ? (isEditing ? "Editar Pessoa" : isViewing ? "Detalhes da Pessoa" : "Nova Pessoa") : "Pessoal"}>
        {!showForm && (
          <PageHeader.Action>
            <Button onClick={() => setIsAddingPersonnel(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Pessoa
            </Button>
          </PageHeader.Action>
        )}
      </PageHeader>
      
      {!showForm && (
        <>
          {/* Personnel Count Cards */}
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Funcionários
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{employeeCount}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Agentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{agentCount}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Lojistas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dealerCount}</div>
              </CardContent>
            </Card>
          </div>
          
          {/* Personnel Table with Tabs */}
          <div className="mt-6">
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="employee">Funcionários ({employeeCount})</TabsTrigger>
                <TabsTrigger value="agent">Agentes ({agentCount})</TabsTrigger>
                <TabsTrigger value="dealer">Lojistas ({dealerCount})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <PersonnelTable />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="employee" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <PersonnelTable filter="employee" />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="agent" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <PersonnelTable filter="agent" />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="dealer" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <PersonnelTable filter="dealer" />
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
            <PersonnelForm 
              editPersonnel={isEditing ? editPersonnel : undefined} 
              onSaveSuccess={() => setIsAddingPersonnel(false)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
