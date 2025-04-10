import { Vehicle } from "@shared/schema";
import { ViewModal } from "@/components/view-modal";
import { formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface VehicleViewModalProps {
  vehicle: Vehicle;
}

const statusMap = {
  available: { label: "Disponível", color: "bg-green-100 text-green-800" },
  reserved: { label: "Reservado", color: "bg-yellow-100 text-yellow-800" },
  sold: { label: "Vendido", color: "bg-red-100 text-red-800" },
};

export function VehicleViewModal({ vehicle }: VehicleViewModalProps) {
  const renderVehicleDetails = (v: Vehicle) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-semibold">Informações Básicas</h3>
          <Separator className="my-2" />
          <dl className="grid grid-cols-[140px_1fr] gap-2 text-sm">
            <dt className="font-medium">Marca/Modelo:</dt>
            <dd>{`${v.make} ${v.model}`}</dd>
            <dt className="font-medium">Ano:</dt>
            <dd>{v.year}</dd>
            <dt className="font-medium">Quilometragem:</dt>
            <dd>{v.km} km</dd>
            <dt className="font-medium">Status:</dt>
            <dd>
              <Badge className={statusMap[v.status]?.color}>
                {statusMap[v.status]?.label || v.status}
              </Badge>
            </dd>
          </dl>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold">Informações Financeiras</h3>
          <Separator className="my-2" />
          <dl className="grid grid-cols-[140px_1fr] gap-2 text-sm">
            <dt className="font-medium">Custo:</dt>
            <dd>{formatCurrency(Number(v.purchaseCost))}</dd>
            <dt className="font-medium">Preço de Venda:</dt>
            <dd>{formatCurrency(Number(v.sellingPrice))}</dd>
            {v.expenses && (
              <>
                <dt className="font-medium">Despesas:</dt>
                <dd>{formatCurrency(Number(v.expenses))}</dd>
              </>
            )}
            <dt className="font-medium">Lucro Potencial:</dt>
            <dd>{formatCurrency(Number(v.sellingPrice) - Number(v.purchaseCost) - Number(v.expenses || 0))}</dd>
          </dl>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold">Descrição e Observações</h3>
        <Separator className="my-2" />
        {v.description && (
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-1">Descrição:</h4>
            <p className="text-sm whitespace-pre-line">{v.description}</p>
          </div>
        )}
        {v.notes && (
          <div>
            <h4 className="text-sm font-medium mb-1">Observações:</h4>
            <p className="text-sm whitespace-pre-line">{v.notes}</p>
          </div>
        )}
      </div>
      
      <div>
        <h3 className="text-lg font-semibold">Informações de Registro</h3>
        <Separator className="my-2" />
        <dl className="grid grid-cols-[140px_1fr] gap-2 text-sm">
          <dt className="font-medium">Adicionado em:</dt>
          <dd>{v.createdAt ? new Date(v.createdAt).toLocaleString('pt-BR') : "-"}</dd>
          <dt className="font-medium">Atualizado em:</dt>
          <dd>{v.updatedAt ? new Date(v.updatedAt).toLocaleString('pt-BR') : "-"}</dd>
        </dl>
      </div>
    </div>
  );

  return (
    <ViewModal
      title={`${vehicle.make} ${vehicle.model} ${vehicle.year}`}
      item={vehicle}
      renderContent={renderVehicleDetails}
    />
  );
}