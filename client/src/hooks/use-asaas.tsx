import { 
  useQuery, 
  useMutation,
  useQueryClient
} from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export type AsaasPaymentMethod = 'BOLETO' | 'CREDIT_CARD' | 'PIX';
export type AsaasPaymentStatus = 'PENDING' | 'CONFIRMED' | 'RECEIVED' | 'OVERDUE' | 'REFUNDED' | 'CANCELED';

export interface AsaasPayment {
  id: string;
  dateCreated: string;
  customer: string;
  value: number;
  netValue: number;
  billingType: AsaasPaymentMethod;
  status: AsaasPaymentStatus;
  dueDate: string;
  description: string;
  invoiceUrl: string;
  bankSlipUrl: string;
  invoiceNumber: string;
  externalReference: string;
  deleted: boolean;
  pixQrCodeImage?: string;
  pixCopiaECola?: string;
}

export interface AsaasBalance {
  balance: number;
}

export interface AsaasCustomer {
  id: string;
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
  deleted: boolean;
  createdAt?: string;
}

export interface CreatePaymentParams {
  customerName: string;
  customerCpfCnpj: string;
  customerEmail?: string;
  customerPhone?: string;
  billingType: AsaasPaymentMethod;
  value: number | string;
  dueDate: string;
  description: string;
  externalReference?: string;
  creditCardData?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  addressInfo?: {
    postalCode?: string;
    address?: string;
    addressNumber?: string;
    complement?: string;
    province?: string;
  };
}

// Interface para configuração de API
export interface AsaasApiConfig {
  apiKey: string;
}

// Mutation para configurar a API
export const useConfigureAsaasApi = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (config: AsaasApiConfig) => {
      const response = await apiRequest('POST', '/api/asaas/config', config);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuração atualizada",
        description: "A chave de API do Asaas foi configurada com sucesso."
      });
      
      // Recarregar dados
      queryClient.invalidateQueries({ queryKey: ['/api/asaas/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/asaas/payments'] });
      
      // Invalidar todas as queries do Asaas para recarregar os dados com a nova API
      queryClient.invalidateQueries({ queryKey: ['/api/asaas'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro de configuração",
        description: `Falha ao configurar a API: ${error.message}`,
        variant: "destructive"
      });
    }
  });
};

export const useAsaas = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Query para obter o saldo
  const balanceQuery = useQuery({
    queryKey: ['/api/asaas/balance'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/asaas/balance');
        const data = await response.json();
        return data as AsaasBalance;
      } catch (error) {
        console.error("Erro ao buscar saldo:", error);
        // Retornamos um objeto com saldo zero para evitar erros na interface
        return { balance: 0 } as AsaasBalance;
      }
    },
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 2,
  });
  
  // Query para listar os clientes
  const useCustomersQuery = (offset = 0, limit = 10, name?: string) => {
    return useQuery({
      queryKey: ['/api/asaas/customers', offset, limit, name],
      queryFn: async () => {
        try {
          let url = `/api/asaas/customers?offset=${offset}&limit=${limit}`;
          if (name) url += `&name=${encodeURIComponent(name)}`;
          
          const response = await apiRequest('GET', url);
          const data = await response.json();
          return data as { data: AsaasCustomer[], totalCount: number };
        } catch (error) {
          console.error("Erro ao buscar clientes:", error);
          // Retornamos um objeto vazio para evitar erros na interface
          return { data: [], totalCount: 0 } as { data: AsaasCustomer[], totalCount: number };
        }
      },
      staleTime: 1000 * 60, // 1 minuto
      retry: 2,
    });
  };
  
  // Query para listar os pagamentos
  const usePaymentsQuery = (offset = 0, limit = 10, status?: string) => {
    return useQuery({
      queryKey: ['/api/asaas/payments', offset, limit, status],
      queryFn: async () => {
        try {
          let url = `/api/asaas/payments?offset=${offset}&limit=${limit}`;
          if (status) url += `&status=${status}`;
          
          const response = await apiRequest('GET', url);
          const data = await response.json();
          return data as { data: AsaasPayment[], totalCount: number };
        } catch (error) {
          console.error("Erro ao buscar pagamentos:", error);
          // Retornamos um objeto vazio para evitar erros na interface
          return { data: [], totalCount: 0 } as { data: AsaasPayment[], totalCount: number };
        }
      },
      staleTime: 1000 * 60, // 1 minuto
      retry: 2,
    });
  };
  
  // Query para buscar um pagamento específico
  const usePaymentQuery = (paymentId?: string) => {
    return useQuery({
      queryKey: ['/api/asaas/payments', paymentId],
      queryFn: async () => {
        if (!paymentId) throw new Error('ID do pagamento é obrigatório');
        
        const response = await apiRequest('GET', `/api/asaas/payments/${paymentId}`);
        const data = await response.json();
        return data as AsaasPayment;
      },
      enabled: !!paymentId, // Só ativa se houver um ID de pagamento
      staleTime: 1000 * 60, // 1 minuto
      retry: 1,
    });
  };
  
  // Mutation para criar um novo pagamento
  const createPaymentMutation = useMutation({
    mutationFn: async (payment: CreatePaymentParams) => {
      const response = await apiRequest('POST', '/api/asaas/payments', payment);
      return await response.json() as AsaasPayment;
    },
    onSuccess: () => {
      toast({
        title: "Cobrança criada com sucesso",
        description: "A cobrança foi criada e enviada ao cliente."
      });
      
      // Invalidar as queries para recarregar os dados
      queryClient.invalidateQueries({ queryKey: ['/api/asaas/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/asaas/balance'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar cobrança",
        description: `Falha ao criar cobrança: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Mutation para cancelar um pagamento
  const cancelPaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      await apiRequest('DELETE', `/api/asaas/payments/${paymentId}`);
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Cobrança cancelada",
        description: "A cobrança foi cancelada com sucesso."
      });
      
      // Invalidar as queries para recarregar os dados
      queryClient.invalidateQueries({ queryKey: ['/api/asaas/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/asaas/balance'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao cancelar cobrança",
        description: `Falha ao cancelar cobrança: ${error.message}`,
        variant: "destructive"
      });
    }
  });
  
  // Formatar valor monetário
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };
  
  // Traduzir status do pagamento
  const translatePaymentStatus = (status: AsaasPaymentStatus): string => {
    const statusMap: Record<AsaasPaymentStatus, string> = {
      'PENDING': 'Pendente',
      'CONFIRMED': 'Confirmado',
      'RECEIVED': 'Recebido',
      'OVERDUE': 'Vencido',
      'REFUNDED': 'Reembolsado',
      'CANCELED': 'Cancelado'
    };
    
    return statusMap[status] || status;
  };
  
  // Traduzir método de pagamento
  const translatePaymentMethod = (method: AsaasPaymentMethod): string => {
    const methodMap: Record<AsaasPaymentMethod, string> = {
      'BOLETO': 'Boleto',
      'CREDIT_CARD': 'Cartão de Crédito',
      'PIX': 'PIX'
    };
    
    return methodMap[method] || method;
  };
  
  // Calcular a taxa aplicada com base no método de pagamento
  const calculateFeeAmount = (value: number, method: AsaasPaymentMethod): number => {
    switch (method) {
      case 'CREDIT_CARD':
        return value * 0.015; // 1,5%
      case 'BOLETO':
        return 1.99; // R$ 1,99 fixo
      case 'PIX':
        return value * 0.0099; // 0,99%
      default:
        return 0;
    }
  };
  
  return {
    balanceQuery,
    useCustomersQuery,
    usePaymentsQuery,
    usePaymentQuery,
    createPaymentMutation,
    cancelPaymentMutation,
    formatCurrency,
    translatePaymentStatus,
    translatePaymentMethod,
    calculateFeeAmount
  };
}

export default useAsaas;