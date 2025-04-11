import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Vehicle } from "@shared/schema";
import { useLocation } from "wouter";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft } from "lucide-react";
import { VehicleTable } from "@/components/vehicles/vehicle-table";
import { VehicleForm } from "@/components/vehicles/vehicle-form";
import { VehicleDetails } from "@/components/vehicles/vehicle-details";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function VehiclesPage() {
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [viewingVehicle, setViewingVehicle] = useState<Vehicle | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });
  
  // Verifica se a URL contém um comando para editar um veículo
  useEffect(() => {
    const path = window.location.pathname;
    const editMatch = /\/vehicles\/edit\/(\d+)/.exec(path);
    
    if (editMatch && editMatch[1] && vehicles) {
      const vehicleId = parseInt(editMatch[1]);
      const vehicle = vehicles.find(v => v.id === vehicleId);
      if (vehicle) {
        setEditingVehicle(vehicle);
        console.log("Editando veículo:", vehicle);
      }
    }
    
    const viewMatch = /\/vehicles\/view\/(\d+)/.exec(path);
    if (viewMatch && viewMatch[1] && vehicles) {
      const vehicleId = parseInt(viewMatch[1]);
      const vehicle = vehicles.find(v => v.id === vehicleId);
      if (vehicle) {
        setViewingVehicle(vehicle);
      }
    }
  }, [vehicles]);
  
  // Count vehicles by status
  const availableCount = vehicles?.filter(v => v.status === "available").length || 0;
  const reservedCount = vehicles?.filter(v => v.status === "reserved").length || 0;
  const soldCount = vehicles?.filter(v => v.status === "sold").length || 0;
  
  return (
    <div>
      <PageHeader title={editingVehicle ? "Editar Veículo" : isAddingVehicle ? "Adicionar Veículo" : viewingVehicle ? "Detalhes do Veículo" : "Inventário de Veículos"}>
        {!isAddingVehicle && !editingVehicle && !viewingVehicle && (
          <PageHeader.Action>
            <Button onClick={() => setIsAddingVehicle(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Veículo
            </Button>
          </PageHeader.Action>
        )}
      </PageHeader>
      
      {!isAddingVehicle && !editingVehicle && !viewingVehicle && (
        <>
          {/* Status Cards */}
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Disponíveis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{availableCount}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Reservados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reservedCount}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Vendidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{soldCount}</div>
              </CardContent>
            </Card>
          </div>
          
          {/* Vehicles Table with Tabs */}
          <div className="mt-6">
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="available">Disponíveis</TabsTrigger>
                <TabsTrigger value="reserved">Reservados</TabsTrigger>
                <TabsTrigger value="sold">Vendidos</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <VehicleTable />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="available" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <VehicleTable />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="reserved" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <VehicleTable />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="sold" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <VehicleTable />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}
      
      {(isAddingVehicle || editingVehicle) && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="mb-4 flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAddingVehicle(false);
                  setEditingVehicle(null);
                  navigate("/vehicles");
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </div>
            <VehicleForm 
              editVehicle={editingVehicle || undefined}
              onSaveSuccess={() => {
                setIsAddingVehicle(false);
                setEditingVehicle(null);
                navigate("/vehicles");
              }} 
            />
          </CardContent>
        </Card>
      )}
      
      {/* Detalhes do veículo */}
      {viewingVehicle && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="mb-4 flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setViewingVehicle(null);
                  navigate("/vehicles");
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para Inventário
              </Button>
            </div>
            <VehicleDetails vehicle={viewingVehicle} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
