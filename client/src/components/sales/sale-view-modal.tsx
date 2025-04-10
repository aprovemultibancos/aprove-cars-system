import { Sale, Vehicle, Customer } from "@shared/schema";
import { ViewModal } from "@/components/view-modal";
import { formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";

interface SaleViewModalProps {
  sale: Sale;
}

export function SaleViewModal({ sale }: SaleViewModalProps) {
  // Buscar dados relacionados para exibir detalhes completos
  const { data: vehicle } = useQuery<Vehicle>({
    queryKey: [`/api/vehicles/${sale.vehicleId}`],
    enabled: !!sale.vehicleId,
  });

  const { data: customer } = useQuery<Customer>({
    queryKey: [`/api/customers/${sale.customerId}`],
    enabled: !!sale.customerId,
  });

  const renderSaleDetails = (s: Sale) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-semibold">Informações da Venda</h3>
          <Separator className="my-2" />
          <dl className="grid grid-cols-[140px_1fr] gap-2 text-sm">
            <dt className="font-medium">ID da Venda:</dt>
            <dd>{s.id}</dd>
            <dt className="font-medium">Data da Venda:</dt>
            <dd>{s.saleDate ? new Date(s.saleDate).toLocaleDateString('pt-BR') : "-"}</dd>
            <dt className="font-medium">Valor:</dt>
            <dd className="font-semibold text-green-600">{formatCurrency(Number(s.salePrice) || 0)}</dd>
            <dt className="font-medium">Método:</dt>
            <dd>{s.paymentMethod || "Não especificado"}</dd>
            <dt className="font-medium">Status:</dt>
            <dd>{s.status || "Concluída"}</dd>
            <dt className="font-medium">Vendedor:</dt>
            <dd>{s.sellerName || "Não especificado"}</dd>
          </dl>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold">Informações do Cliente</h3>
          <Separator className="my-2" />
          <dl className="grid grid-cols-[140px_1fr] gap-2 text-sm">
            <dt className="font-medium">Nome:</dt>
            <dd>{s.customerName || customer?.name || "Não especificado"}</dd>
            <dt className="font-medium">CPF/CNPJ:</dt>
            <dd>{customer?.document || "Não especificado"}</dd>
            <dt className="font-medium">Email:</dt>
            <dd>{customer?.email || "Não especificado"}</dd>
            <dt className="font-medium">Telefone:</dt>
            <dd>{customer?.phone || "Não especificado"}</dd>
            {customer?.address && (
              <>
                <dt className="font-medium">Endereço:</dt>
                <dd>{customer.address}</dd>
              </>
            )}
          </dl>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold">Informações do Veículo</h3>
        <Separator className="my-2" />
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
            <dt className="font-medium">Marca/Modelo:</dt>
            <dd>{vehicle ? `${vehicle.make} ${vehicle.model}` : s.vehicleName || "Não especificado"}</dd>
            <dt className="font-medium">Ano:</dt>
            <dd>{vehicle?.year || "Não especificado"}</dd>
            <dt className="font-medium">Placa:</dt>
            <dd>{vehicle?.licensePlate || "Não especificado"}</dd>
            <dt className="font-medium">Cor:</dt>
            <dd>{vehicle?.color || "Não especificado"}</dd>
          </div>
          
          <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
            <dt className="font-medium">Preço de Compra:</dt>
            <dd>{vehicle ? formatCurrency(Number(vehicle.purchasePrice) || 0) : "Não especificado"}</dd>
            <dt className="font-medium">Preço de Venda:</dt>
            <dd className="font-semibold">{formatCurrency(Number(s.salePrice) || 0)}</dd>
            <dt className="font-medium">Lucro Bruto:</dt>
            <dd className="text-green-600 font-semibold">
              {vehicle && s.salePrice
                ? formatCurrency(Number(s.salePrice) - Number(vehicle.purchasePrice || 0))
                : "Não disponível"}
            </dd>
          </div>
        </dl>
      </div>
      
      {s.notes && (
        <div>
          <h3 className="text-lg font-semibold">Observações</h3>
          <Separator className="my-2" />
          <p className="text-sm whitespace-pre-line">{s.notes}</p>
        </div>
      )}
      
      <div>
        <h3 className="text-lg font-semibold">Informações de Registro</h3>
        <Separator className="my-2" />
        <dl className="grid grid-cols-[140px_1fr] gap-2 text-sm">
          <dt className="font-medium">Criado em:</dt>
          <dd>{s.createdAt ? new Date(s.createdAt).toLocaleString('pt-BR') : "-"}</dd>
        </dl>
      </div>
    </div>
  );

  return (
    <ViewModal
      title={`Venda #${sale.id}`}
      item={sale}
      renderContent={renderSaleDetails}
    />
  );
}