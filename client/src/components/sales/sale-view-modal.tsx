import { formatCurrency } from "@/lib/utils";
import { Sale, Vehicle } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

interface SaleViewModalProps {
  sale: Sale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaleViewModal({ sale, open, onOpenChange }: SaleViewModalProps) {
  const { data: vehicle } = useQuery<Vehicle>({
    queryKey: [`/api/vehicles/${sale.vehicleId}`],
    enabled: !!sale.vehicleId
  });

  const formatDate = (dateString?: string | Date | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  };
  
  const getPaymentMethodLabel = (method: string) => {
    const methodMap: Record<string, string> = {
      cash: "Dinheiro",
      credit_card: "Cartão de Crédito",
      debit_card: "Cartão de Débito",
      bank_transfer: "Transferência",
      pix: "PIX",
      financing: "Financiamento"
    };
    
    return methodMap[method] || method;
  };

  const vehicleFullName = vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.year})` : `Veículo #${sale.vehicleId}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detalhes da Venda</DialogTitle>
          <DialogDescription>
            Venda #{sale.id} • {formatDate(sale.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Informações da Venda</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Data da Venda</p>
                <p className="font-medium">{formatDate(sale.saleDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor de Venda</p>
                <p className="font-medium">{formatCurrency(Number(sale.salePrice))}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Método de Pagamento</p>
                <p className="font-medium">{getPaymentMethodLabel(sale.paymentMethod)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Comissão</p>
                <p className="font-medium">{formatCurrency(Number(sale.commission))}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Informações do Veículo</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Veículo</p>
                <p className="font-medium">{vehicleFullName}</p>
              </div>
              {vehicle && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Quilometragem</p>
                    <p className="font-medium">{vehicle.km} km</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Preço de Compra</p>
                    <p className="font-medium">{formatCurrency(Number(vehicle.purchaseCost))}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Despesas</p>
                    <p className="font-medium">
                      {vehicle.expenses 
                        ? formatCurrency(Number(vehicle.expenses)) 
                        : "Sem despesas registradas"}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Informações do Cliente</h3>
          <div className="space-y-2">
            <p className="font-medium">{sale.customerName || "Cliente não especificado"}</p>
          </div>
        </div>

        {sale.notes && (
          <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">Observações</h3>
            <p className="text-sm whitespace-pre-wrap">{sale.notes}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}