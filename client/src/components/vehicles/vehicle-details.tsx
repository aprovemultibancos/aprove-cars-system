import { Vehicle } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface VehicleDetailsProps {
  vehicle: Vehicle;
}

export function VehicleDetails({ vehicle }: VehicleDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Marca</p>
                <p className="font-medium">{vehicle.make}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Modelo</p>
                <p className="font-medium">{vehicle.model}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ano</p>
                <p className="font-medium">{vehicle.year}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Quilometragem</p>
                <p className="font-medium">{vehicle.km} km</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Placa</p>
                <p className="font-medium">{"Não informada"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Chassis</p>
                <p className="font-medium">{"Não informado"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">RENAVAM</p>
                <p className="font-medium">{"Não informado"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <p className="font-medium">{
                  vehicle.status === "available" ? "Disponível" :
                  vehicle.status === "reserved" ? "Reservado" :
                  vehicle.status === "sold" ? "Vendido" : "Desconhecido"
                }</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informações Financeiras</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valor de Compra</p>
                <p className="font-medium">{formatCurrency(Number(vehicle.purchaseCost))}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Preço de Venda</p>
                <p className="font-medium">{formatCurrency(Number(vehicle.sellingPrice))}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Despesas</p>
                <p className="font-medium">{formatCurrency(Number(vehicle.expenses || 0))}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Lucro Potencial</p>
                <p className="font-medium text-green-600">
                  {formatCurrency(Number(vehicle.sellingPrice) - Number(vehicle.purchaseCost) - Number(vehicle.expenses || 0))}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Data de Entrada</p>
                <p className="font-medium">
                  {vehicle.createdAt ? format(new Date(vehicle.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: pt }) : "Não informada"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Descrição e Características</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Descrição</p>
              <p className="mt-1 whitespace-pre-line">{vehicle.description || "Nenhuma descrição fornecida."}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Cor</p>
              <p className="font-medium">{"Não informada"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Combustível</p>
              <p className="font-medium">{"Não informado"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}