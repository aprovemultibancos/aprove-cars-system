import { formatCurrency } from "@/lib/utils";
import { Financing } from "@shared/schema";
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

interface FinancingViewModalProps {
  financing: Financing;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FinancingViewModal({ financing, open, onOpenChange }: FinancingViewModalProps) {
  const formatDate = (dateString?: string | Date | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  };
  
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Aprovado</Badge>;
      case "analysis":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Em análise</Badge>;
      case "paid":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Pago</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Negado</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detalhes do Financiamento</DialogTitle>
          <DialogDescription>
            Financiamento #{financing.id} • {formatDate(financing.createdAt)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Informações Básicas</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{financing.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Banco</p>
                <p className="font-medium">{financing.bank}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">{getStatusBadge(financing.status)}</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Informações Financeiras</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Valor do Bem</p>
                <p className="font-medium">{formatCurrency(Number(financing.assetValue))}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo de Retorno</p>
                <p className="font-medium">{financing.returnType}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Retorno Esperado</p>
                <p className="font-medium">{formatCurrency(Number(financing.expectedReturn || 0))}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <h3 className="text-lg font-medium mb-2">Comissões</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Agente/Loja</p>
              <p className="font-medium">{financing.agentName || "Não especificado"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Comissão do Agente</p>
              <p className="font-medium">{formatCurrency(Number(financing.agentCommission))}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Comissão do Vendedor</p>
              <p className="font-medium">{formatCurrency(Number(financing.sellerCommission))}</p>
            </div>
          </div>
        </div>

        {financing.notes && (
          <div className="mt-3">
            <h3 className="text-lg font-medium mb-2">Observações</h3>
            <p className="text-sm whitespace-pre-wrap">{financing.notes}</p>
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