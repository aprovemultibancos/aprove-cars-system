import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Vehicle } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/utils";

interface RecentVehiclesProps {
  vehicles: Partial<Vehicle>[];
  isLoading?: boolean;
}

export function RecentVehicles({ vehicles, isLoading = false }: RecentVehiclesProps) {
  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Veículos Recentes</h3>
          <Link href="/vehicles" className="text-sm font-medium text-primary hover:text-primary-600">
            Ver todos
          </Link>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-100 rounded w-full"></div>
          <div className="h-16 bg-gray-100 rounded w-full"></div>
          <div className="h-16 bg-gray-100 rounded w-full"></div>
          <div className="h-16 bg-gray-100 rounded w-full"></div>
        </div>
      </Card>
    );
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Disponível</Badge>;
      case "reserved":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Reservado</Badge>;
      case "sold":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Vendido</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const getVehicleImage = (vehicle: Partial<Vehicle>) => {
    // This would use the first image from the vehicle if available
    return "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?ixlib=rb-1.2.1&auto=format&fit=crop&w=256&h=256&q=80";
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Veículos Recentes</h3>
        <Link href="/vehicles" className="text-sm font-medium text-primary hover:text-primary-600">
          Ver todos
        </Link>
      </div>
      <div className="flex flex-col">
        <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
            <div className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Veículo</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-sm text-gray-500">
                        Nenhum veículo cadastrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    vehicles.map((vehicle, index) => (
                      <TableRow key={vehicle.id || index}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center">
                            <Avatar className="h-10 w-10 rounded-full">
                              <AvatarImage src={getVehicleImage(vehicle)} alt="Vehicle" />
                              <AvatarFallback>V</AvatarFallback>
                            </Avatar>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{`${vehicle.make} ${vehicle.model} ${vehicle.year}`}</div>
                              <div className="text-sm text-gray-500">{vehicle.km} km</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatCurrency(Number(vehicle.sellingPrice) || 0)}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {getStatusBadge(vehicle.status)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-gray-500">
                          {new Date(vehicle.createdAt || Date.now()).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right text-sm font-medium">
                          <Link href={`/vehicles/${vehicle.id}`} className="text-primary hover:text-primary-800">
                            Editar
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
