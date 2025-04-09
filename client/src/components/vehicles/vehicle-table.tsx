import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Vehicle } from "@shared/schema";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Eye, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function VehicleTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [vehicleToDelete, setVehicleToDelete] = useState<number | null>(null);
  
  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/vehicles/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Veículo removido",
        description: "O veículo foi removido com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setVehicleToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao remover o veículo",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (vehicleToDelete) {
      deleteMutation.mutate(vehicleToDelete);
    }
  };

  const columns: ColumnDef<Vehicle>[] = [
    {
      accessorKey: "id",
      header: "ID",
    },
    {
      accessorKey: "vehicle",
      header: "Veículo",
      cell: ({ row }) => {
        const vehicle = row.original;
        return (
          <div className="flex items-center">
            <Avatar className="h-10 w-10 rounded-full">
              <AvatarImage src="" alt={`${vehicle.make} ${vehicle.model}`} />
              <AvatarFallback>{vehicle.make.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="ml-4">
              <div className="font-medium">{`${vehicle.make} ${vehicle.model}`}</div>
              <div className="text-sm text-muted-foreground">{`${vehicle.year} • ${vehicle.km} km`}</div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "purchaseCost",
      header: "Custo",
      cell: ({ row }) => formatCurrency(Number(row.original.purchaseCost)),
    },
    {
      accessorKey: "sellingPrice",
      header: "Preço",
      cell: ({ row }) => formatCurrency(Number(row.original.sellingPrice)),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const statusMap = {
          available: { label: "Disponível", classes: "bg-green-100 text-green-800 hover:bg-green-100" },
          reserved: { label: "Reservado", classes: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
          sold: { label: "Vendido", classes: "bg-red-100 text-red-800 hover:bg-red-100" },
        };
        
        const statusInfo = statusMap[status as keyof typeof statusMap] || { label: "Desconhecido", classes: "" };
        
        return (
          <Badge className={statusInfo.classes}>
            {statusInfo.label}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const vehicle = row.original;
        
        return (
          <div className="flex items-center justify-end space-x-2">
            <Link href={`/vehicles/${vehicle.id}/view`}>
              <Button variant="ghost" size="icon">
                <Eye className="h-4 w-4" />
                <span className="sr-only">Visualizar</span>
              </Button>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-red-500 hover:text-red-700"
                  onClick={() => setVehicleToDelete(vehicle.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Excluir</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir o veículo {vehicle.make} {vehicle.model} {vehicle.year}?
                    Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setVehicleToDelete(null)}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
    },
  ];

  if (isLoading) {
    return <div className="animate-pulse p-4 space-y-4">
      <div className="h-8 bg-gray-100 rounded w-1/4"></div>
      <div className="h-64 bg-gray-100 rounded w-full"></div>
    </div>;
  }

  return (
    <DataTable 
      columns={columns} 
      data={vehicles || []} 
      searchKey="vehicle"
      searchPlaceholder="Buscar veículos..."
    />
  );
}
