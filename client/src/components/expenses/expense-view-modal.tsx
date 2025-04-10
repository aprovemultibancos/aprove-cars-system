import { Expense } from "@shared/schema";
import { ViewModal } from "@/components/view-modal";
import { formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface ExpenseViewModalProps {
  expense: Expense;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ExpenseViewModal({ expense, open, onOpenChange }: ExpenseViewModalProps) {
  const renderExpenseDetails = (e: Expense) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-semibold">Informações da Despesa</h3>
          <Separator className="my-2" />
          <dl className="grid grid-cols-[140px_1fr] gap-2 text-sm">
            <dt className="font-medium">ID:</dt>
            <dd>{e.id}</dd>
            <dt className="font-medium">Descrição:</dt>
            <dd>{e.description}</dd>
            <dt className="font-medium">Valor:</dt>
            <dd className="font-semibold text-red-600">{formatCurrency(Number(e.amount) || 0)}</dd>
            <dt className="font-medium">Data:</dt>
            <dd>{e.date ? new Date(e.date).toLocaleDateString('pt-BR') : "-"}</dd>
            <dt className="font-medium">Categoria:</dt>
            <dd>
              <Badge variant="outline">{e.category || "Sem categoria"}</Badge>
            </dd>
            <dt className="font-medium">Tipo:</dt>
            <dd>
              <Badge variant={e.type === "fixed" ? "secondary" : "default"}>
                {e.type === "fixed" ? "Fixa" : "Variável"}
              </Badge>
            </dd>
          </dl>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold">Informações Adicionais</h3>
          <Separator className="my-2" />
          <dl className="grid grid-cols-[140px_1fr] gap-2 text-sm">
            <dt className="font-medium">Beneficiário:</dt>
            <dd>{e.payeeId ? `Beneficiário #${e.payeeId}` : "Não especificado"}</dd>
            <dt className="font-medium">Data de Criação:</dt>
            <dd>{e.createdAt ? new Date(e.createdAt).toLocaleDateString('pt-BR') : "-"}</dd>
          </dl>
        </div>
      </div>
      
      {e.notes && (
        <div>
          <h3 className="text-lg font-semibold">Observações</h3>
          <Separator className="my-2" />
          <p className="text-sm whitespace-pre-line">{e.notes}</p>
        </div>
      )}
    </div>
  );

  return (
    <ViewModal
      title={`Despesa: ${expense.description}`}
      item={expense}
      renderContent={renderExpenseDetails}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}