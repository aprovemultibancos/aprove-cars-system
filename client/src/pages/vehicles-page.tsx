import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Vehicle } from "@shared/schema";
import { useRoute, useLocation } from "wouter";
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
  const [matchVehicleId] = useRoute<{ id: string }>("/vehicles/:id");
  const [matchVehicleAction] = useRoute<{ id: string, action: string }>("/vehicles/:id/:action");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });
  
  // Get vehicle ID from the URL if available
  const vehicleId = matchVehicleId?.params?.id || matchVehicleAction?.params?.id || null;
  const action = matchVehicleAction?.params?.action || null;
  
  // If we have a vehicle ID in the URL, get that vehicle's data
  const vehicle = vehicleId && vehicles ? vehicles.find(v => v.id.toString() === vehicleId.toString()) : undefined;
  
  // Check if we're viewing vehicle details
  const isViewing = action === "view" && Boolean(vehicle);
  
  // Show form if adding a new vehicle
  const showForm = isAddingVehicle;
  
  // Show vehicle details if viewing a vehicle
  const showDetails = isViewing;
  
  // Count vehicles by status
  const availableCount = vehicles?.filter(v => v.status === "available").length || 0;
  const reservedCount = vehicles?.filter(v => v.status === "reserved").length || 0;
  const soldCount = vehicles?.filter(v => v.status === "sold").length || 0;
  
  return (
    <div>
      <PageHeader title={showForm ? "Adicionar Veículo" : isViewing ? "Detalhes do Veículo" : "Inventário de Veículos"}>
        {!showForm && !showDetails && (
          <PageHeader.Action>
            <Button onClick={() => setIsAddingVehicle(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Veículo
            </Button>
          </PageHeader.Action>
        )}
      </PageHeader>
      
      {!showForm && !showDetails && (
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
      
      {showForm && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="mb-4 flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAddingVehicle(false);
                  navigate("/vehicles");
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </div>
            <VehicleForm 
              onSaveSuccess={() => setIsAddingVehicle(false)} 
            />
          </CardContent>
        </Card>
      )}
      
      {/* Detalhes do veículo */}
      {showDetails && vehicle && (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="mb-4 flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => navigate("/vehicles")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para Inventário
              </Button>
            </div>
            <VehicleDetails vehicle={vehicle} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
