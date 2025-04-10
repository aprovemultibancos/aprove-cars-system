import { Personnel } from "@shared/schema";
import { ViewModal } from "@/components/view-modal";
import { formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface PersonnelViewModalProps {
  personnel: Personnel;
}

const typeMap = {
  employee: { label: "Funcionário", color: "default" },
  agent: { label: "Agente", color: "secondary" },
  partner: { label: "Parceiro", color: "primary" },
};

export function PersonnelViewModal({ personnel }: PersonnelViewModalProps) {
  const renderPersonnelDetails = (p: Personnel) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-semibold">Informações Pessoais</h3>
          <Separator className="my-2" />
          <dl className="grid grid-cols-[140px_1fr] gap-2 text-sm">
            <dt className="font-medium">Nome:</dt>
            <dd>{p.name}</dd>
            <dt className="font-medium">Tipo:</dt>
            <dd>
              <Badge variant={typeMap[p.type]?.color as any || "default"}>
                {typeMap[p.type]?.label || p.type}
              </Badge>
            </dd>
            <dt className="font-medium">Cargo/Função:</dt>
            <dd>{p.role || "Não especificado"}</dd>
            <dt className="font-medium">Status:</dt>
            <dd>
              <Badge variant={p.isActive ? "success" : "destructive"}>
                {p.isActive ? "Ativo" : "Inativo"}
              </Badge>
            </dd>
            <dt className="font-medium">Documento:</dt>
            <dd>{p.document || "Não especificado"}</dd>
          </dl>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold">Informações de Contato</h3>
          <Separator className="my-2" />
          <dl className="grid grid-cols-[140px_1fr] gap-2 text-sm">
            <dt className="font-medium">Email:</dt>
            <dd>{p.email || "Não especificado"}</dd>
            <dt className="font-medium">Telefone:</dt>
            <dd>{p.phone || "Não especificado"}</dd>
          </dl>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold">Informações Financeiras</h3>
        <Separator className="my-2" />
        <dl className="grid grid-cols-[180px_1fr] gap-2 text-sm">
          <dt className="font-medium">Taxa de Comissão:</dt>
          <dd>{Number(p.commissionRate).toFixed(2)}%</dd>
          <dt className="font-medium">Informações Bancárias:</dt>
          <dd>{p.bankInfo || "Não especificado"}</dd>
        </dl>
      </div>
      
      {p.notes && (
        <div>
          <h3 className="text-lg font-semibold">Observações</h3>
          <Separator className="my-2" />
          <p className="text-sm whitespace-pre-line">{p.notes}</p>
        </div>
      )}
      
      <div>
        <h3 className="text-lg font-semibold">Informações de Registro</h3>
        <Separator className="my-2" />
        <dl className="grid grid-cols-[140px_1fr] gap-2 text-sm">
          <dt className="font-medium">Criado em:</dt>
          <dd>{p.createdAt ? new Date(p.createdAt).toLocaleString('pt-BR') : "-"}</dd>
        </dl>
      </div>
    </div>
  );

  return (
    <ViewModal
      title={`${personnel.name} - ${typeMap[personnel.type]?.label || personnel.type}`}
      item={personnel}
      renderContent={renderPersonnelDetails}
    />
  );
}