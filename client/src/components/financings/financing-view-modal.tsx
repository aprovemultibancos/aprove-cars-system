import { Financing, Personnel } from "@shared/schema";
import { ViewModal } from "@/components/view-modal";
import { formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

interface FinancingViewModalProps {
  financing: Financing;
}

const statusMap = {
  analysis: { label: "Em Análise", color: "warning" },
  approved: { label: "Aprovado", color: "success" },
  paid: { label: "Pago", color: "success" },
  rejected: { label: "Rejeitado", color: "destructive" },
};

export function FinancingViewModal({ financing }: FinancingViewModalProps) {
  // Buscar dados do agente para exibir informações completas
  const { data: agent } = useQuery<Personnel>({
    queryKey: [`/api/personnel/${financing.agentId}`],
    enabled: !!financing.agentId,
  });

  const renderFinancingDetails = (f: Financing) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-semibold">Informações do Financiamento</h3>
          <Separator className="my-2" />
          <dl className="grid grid-cols-[160px_1fr] gap-2 text-sm">
            <dt className="font-medium">ID do Financiamento:</dt>
            <dd>{f.id}</dd>
            <dt className="font-medium">Cliente:</dt>
            <dd>{f.customerName || "Não especificado"}</dd>
            <dt className="font-medium">Banco:</dt>
            <dd>{f.bank}</dd>
            <dt className="font-medium">Data de Criação:</dt>
            <dd>{f.createdAt ? new Date(f.createdAt).toLocaleDateString('pt-BR') : "-"}</dd>
            <dt className="font-medium">Status:</dt>
            <dd>
              <Badge variant={statusMap[f.status]?.color as any || "default"}>
                {statusMap[f.status]?.label || f.status}
              </Badge>
            </dd>
          </dl>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold">Informações Financeiras</h3>
          <Separator className="my-2" />
          <dl className="grid grid-cols-[180px_1fr] gap-2 text-sm">
            <dt className="font-medium">Valor do Bem:</dt>
            <dd>{formatCurrency(Number(f.assetValue) || 0)}</dd>
            <dt className="font-medium">Tipo de Retorno:</dt>
            <dd>{f.returnType}</dd>
            <dt className="font-medium">% Acessórios:</dt>
            <dd>{Number(f.accessoriesPercentage).toFixed(2)}%</dd>
            <dt className="font-medium">Valor da Taxa:</dt>
            <dd>{formatCurrency(Number(f.feeAmount) || 0)}</dd>
            <dt className="font-medium">Valor Liberado:</dt>
            <dd className="font-semibold text-green-600">{formatCurrency(Number(f.releasedAmount) || 0)}</dd>
            <dt className="font-medium">Retorno Esperado:</dt>
            <dd className="font-semibold text-green-600">{formatCurrency(Number(f.expectedReturn) || 0)}</dd>
          </dl>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold">Informações de Comissão</h3>
        <Separator className="my-2" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <dl className="grid grid-cols-[160px_1fr] gap-2 text-sm">
            <dt className="font-medium">Agente:</dt>
            <dd>{agent?.name || "Agente #" + f.agentId}</dd>
            <dt className="font-medium">Comissão do Agente:</dt>
            <dd>{formatCurrency(Number(f.agentCommission) || 0)}</dd>
          </dl>
          
          <dl className="grid grid-cols-[160px_1fr] gap-2 text-sm">
            <dt className="font-medium">Comissão do Vendedor:</dt>
            <dd>{formatCurrency(Number(f.sellerCommission) || 0)}</dd>
            <dt className="font-medium">Total de Comissões:</dt>
            <dd className="font-semibold">
              {formatCurrency((Number(f.agentCommission) || 0) + (Number(f.sellerCommission) || 0))}
            </dd>
          </dl>
        </div>
      </div>
      
      {f.notes && (
        <div>
          <h3 className="text-lg font-semibold">Observações</h3>
          <Separator className="my-2" />
          <p className="text-sm whitespace-pre-line">{f.notes}</p>
        </div>
      )}
    </div>
  );

  return (
    <ViewModal
      title={`Financiamento #${financing.id} - ${financing.bank}`}
      item={financing}
      renderContent={renderFinancingDetails}
    />
  );
}