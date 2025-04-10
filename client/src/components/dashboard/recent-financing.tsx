import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Financing, Customer } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";

interface FinancingWithCustomer extends Partial<Financing> {
  customer?: Partial<Customer>;
  agentName?: string;
}

interface RecentFinancingProps {
  financings: FinancingWithCustomer[];
  isLoading?: boolean;
}

export function RecentFinancing({ financings, isLoading = false }: RecentFinancingProps) {
  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Propostas de Financiamento Recentes</h3>
          <Link href="/finances" className="text-sm font-medium text-primary hover:text-primary-600">
            Ver todas
          </Link>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-100 rounded w-full"></div>
          <div className="h-16 bg-gray-100 rounded w-full"></div>
          <div className="h-16 bg-gray-100 rounded w-full"></div>
          <div className="h-16 bg-gray-100 rounded w-full"></div>
        </div>
      </Card>
    );
  }

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
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Propostas de Financiamento Recentes</h3>
        <Link href="/finances" className="text-sm font-medium text-primary hover:text-primary-600">
          Ver todas
        </Link>
      </div>
      <div className="flex flex-col">
        <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
            <div className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Agente</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-sm text-gray-500">
                        Nenhum financiamento cadastrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    financings.map((financing, index) => (
                      <TableRow key={financing.id || index}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="ml-0">
                              <div className="text-sm font-medium text-gray-900">{financing.customer?.name || "Cliente não identificado"}</div>
                              <div className="text-sm text-gray-500">{financing.customer?.email || "Email não disponível"}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="text-sm text-gray-900">{financing.bank}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatCurrency(Number(financing.assetValue) || 0)}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {getStatusBadge(financing.status)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-gray-500">
                          {financing.agentName || "Não designado"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right text-sm font-medium">
                          <Link href={`/finances/${financing.id}`} className="text-primary hover:text-primary-800">
                            Detalhes
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
