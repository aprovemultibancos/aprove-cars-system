import { Vehicle } from "@shared/schema";
import { ViewModal } from "@/components/view-modal";
import { formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface VehicleViewModalProps {
  vehicle: Vehicle;
}

export function VehicleViewModal({ vehicle }: VehicleViewModalProps) {
  const renderVehicleDetails = (v: Vehicle) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-semibold">Informações do Veículo</h3>
          <Separator className="my-2" />
          <dl className="grid grid-cols-[100px_1fr] gap-2 text-sm">
            <dt className="font-medium">Marca:</dt>
            <dd>{v.make}</dd>
            <dt className="font-medium">Modelo:</dt>
            <dd>{v.model}</dd>
            <dt className="font-medium">Ano:</dt>
            <dd>{v.year}</dd>
            <dt className="font-medium">Placa:</dt>
            <dd>{v.licensePlate}</dd>
            <dt className="font-medium">Chassi:</dt>
            <dd>{v.chassis || "-"}</dd>
            <dt className="font-medium">Cor:</dt>
            <dd>{v.color}</dd>
            <dt className="font-medium">Km:</dt>
            <dd>{v.mileage?.toLocaleString() || "-"} km</dd>
            <dt className="font-medium">Status:</dt>
            <dd>
              <Badge variant={v.status === "available" ? "success" : "destructive"}>
                {v.status === "available" ? "Disponível" : "Vendido"}
              </Badge>
            </dd>
          </dl>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold">Informações Financeiras</h3>
          <Separator className="my-2" />
          <dl className="grid grid-cols-[140px_1fr] gap-2 text-sm">
            <dt className="font-medium">Preço de Compra:</dt>
            <dd>{formatCurrency(Number(v.purchasePrice) || 0)}</dd>
            <dt className="font-medium">Preço de Venda:</dt>
            <dd>{formatCurrency(Number(v.salePrice) || 0)}</dd>
            <dt className="font-medium">Data de Aquisição:</dt>
            <dd>{v.acquisitionDate ? new Date(v.acquisitionDate).toLocaleDateString('pt-BR') : "-"}</dd>
            <dt className="font-medium">Data de Venda:</dt>
            <dd>{v.saleDate ? new Date(v.saleDate).toLocaleDateString('pt-BR') : "-"}</dd>
          </dl>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold">Características</h3>
        <Separator className="my-2" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <dl className="grid grid-cols-[140px_1fr] gap-2 text-sm">
            <dt className="font-medium">Combustível:</dt>
            <dd>{v.fuelType || "-"}</dd>
            <dt className="font-medium">Transmissão:</dt>
            <dd>{v.transmission || "-"}</dd>
            <dt className="font-medium">Potência:</dt>
            <dd>{v.enginePower ? `${v.enginePower} cv` : "-"}</dd>
            <dt className="font-medium">Motor:</dt>
            <dd>{v.engineSize ? `${v.engineSize}` : "-"}</dd>
          </dl>
          
          <dl className="grid grid-cols-[140px_1fr] gap-2 text-sm">
            <dt className="font-medium">Portas:</dt>
            <dd>{v.doors || "-"}</dd>
            <dt className="font-medium">Categoria:</dt>
            <dd>{v.category || "-"}</dd>
            <dt className="font-medium">Tipo:</dt>
            <dd>{v.bodyType || "-"}</dd>
          </dl>
        </div>
      </div>
      
      {v.features && v.features.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold">Opcionais</h3>
          <Separator className="my-2" />
          <div className="flex flex-wrap gap-2">
            {v.features.map((feature, index) => (
              <Badge key={index} variant="outline">
                {feature}
              </Badge>
            ))}
          </div>
        </div>
      )}
      
      {v.notes && (
        <div>
          <h3 className="text-lg font-semibold">Observações</h3>
          <Separator className="my-2" />
          <p className="text-sm whitespace-pre-line">{v.notes}</p>
        </div>
      )}
    </div>
  );

  return (
    <ViewModal
      title={`${vehicle.make} ${vehicle.model} (${vehicle.year})`}
      item={vehicle}
      renderContent={renderVehicleDetails}
    />
  );
}