import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { Eye, MoreVertical, ReceiptText, RefreshCw, FileDown, Copy, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

// Define o tipo de um pagamento (conforme API do Asaas)
interface Payment {
  id: string;
  customer: string;
  customerName: string;
  value: number;
  netValue: number;
  originalValue?: number;
  description: string;
  billingType: string;
  status: string;
  dueDate: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixQrCodeUrl?: string;
  createdAt: string;
  paymentDate?: string;
  confirmedDate?: string;
  customerDocumentNumber?: string;
}

export function PaymentList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("");
  const [paymentToCancel, setPaymentToCancel] = useState<Payment | null>(null);

  // Consulta os pagamentos
  const { data: payments, isLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });

  // Filtra os pagamentos pela descrição ou nome do cliente
  const filteredPayments = payments?.filter(payment => 
    payment.description.toLowerCase().includes(filter.toLowerCase()) ||
    payment.customerName.toLowerCase().includes(filter.toLowerCase())
  ) || [];

  // Mutação para cancelar um pagamento
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/payments/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Pagamento cancelado",
        description: "O pagamento foi cancelado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      setPaymentToCancel(null);
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro ao cancelar o pagamento",
        variant: "destructive",
      });
    },
  });

  const handleCancelPayment = () => {
    if (paymentToCancel) {
      cancelMutation.mutate(paymentToCancel.id);
    }
  };

  // Determina a cor do status do pagamento
  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string, variant: "default" | "secondary" | "destructive" | "outline" }> = {
      PENDING: { label: "Pendente", variant: "outline" },
      CONFIRMED: { label: "Confirmado", variant: "secondary" },
      RECEIVED: { label: "Recebido", variant: "default" },
      OVERDUE: { label: "Vencido", variant: "destructive" },
      REFUNDED: { label: "Reembolsado", variant: "outline" },
      CANCELED: { label: "Cancelado", variant: "outline" },
    };

    return statusMap[status] || { label: status, variant: "outline" };
  };

  // Função para copiar URL para a área de transferência
  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "URL copiada",
        description: message,
      });
    });
  };

  // Obtém o ícone do tipo de pagamento
  const getBillingTypeIcon = (type: string) => {
    switch (type) {
      case "BOLETO":
        return <ReceiptText className="h-4 w-4" />;
      case "PIX":
        return <FileDown className="h-4 w-4" />;
      case "CREDIT_CARD":
        return <RefreshCw className="h-4 w-4" />;
      default:
        return <ReceiptText className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Filtrar por descrição ou cliente..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filteredPayments.length === 0 ? (
        <div className="text-center p-6 border rounded-lg">
          <p className="text-muted-foreground">Nenhum pagamento encontrado</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.customerName}</TableCell>
                  <TableCell>{payment.description}</TableCell>
                  <TableCell>
                    {formatCurrency(payment.value)}
                    {payment.originalValue && payment.billingType === "CREDIT_CARD" && (
                      <div className="text-xs text-muted-foreground">
                        Orig: {formatCurrency(payment.originalValue)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {getBillingTypeIcon(payment.billingType)}
                      <span className="ml-2">{payment.billingType}</span>
                    </div>
                  </TableCell>
                  <TableCell>{format(new Date(payment.dueDate), "dd/MM/yyyy")}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadge(payment.status).variant}>
                      {getStatusBadge(payment.status).label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menu</span>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {payment.invoiceUrl && (
                          <DropdownMenuItem onClick={() => window.open(payment.invoiceUrl, '_blank')}>
                            <Eye className="mr-2 h-4 w-4" />
                            <span>Ver fatura</span>
                          </DropdownMenuItem>
                        )}
                        {payment.bankSlipUrl && (
                          <DropdownMenuItem onClick={() => window.open(payment.bankSlipUrl, '_blank')}>
                            <ReceiptText className="mr-2 h-4 w-4" />
                            <span>Ver boleto</span>
                          </DropdownMenuItem>
                        )}
                        {payment.pixQrCodeUrl && (
                          <DropdownMenuItem onClick={() => window.open(payment.pixQrCodeUrl, '_blank')}>
                            <FileDown className="mr-2 h-4 w-4" />
                            <span>Ver QR Code PIX</span>
                          </DropdownMenuItem>
                        )}
                        {payment.invoiceUrl && (
                          <DropdownMenuItem onClick={() => copyToClipboard(payment.invoiceUrl!, "Link da fatura copiado")}>
                            <Copy className="mr-2 h-4 w-4" />
                            <span>Copiar link da fatura</span>
                          </DropdownMenuItem>
                        )}
                        {payment.status === "PENDING" && (
                          <DropdownMenuItem onClick={() => setPaymentToCancel(payment)}>
                            <X className="mr-2 h-4 w-4" />
                            <span>Cancelar pagamento</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Diálogo de confirmação para cancelar pagamento */}
      <AlertDialog open={!!paymentToCancel} onOpenChange={(open) => !open && setPaymentToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar o pagamento{' '}
              <strong>{paymentToCancel?.description}</strong> no valor de{' '}
              <strong>{paymentToCancel && formatCurrency(paymentToCancel.value)}</strong>?
              <br /><br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelPayment}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                'Confirmar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}