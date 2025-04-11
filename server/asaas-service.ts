import fetch from "node-fetch";

// Define o ambiente (sandbox ou produção)
const ASAAS_ENV = process.env.NODE_ENV === "production" ? "api" : "api-sandbox";
const ASAAS_BASE_URL = `https://${ASAAS_ENV}.asaas.com/v3`;
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

// Definir os tipos para a API Asaas
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
}

export interface AsaasPayment {
  id: string;
  customer: string;
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
  installment?: string;
  externalReference?: string;
  createdAt: string;
  paymentDate?: string;
  clientPaymentDate?: string;
  confirmedDate?: string;
  failReasonCode?: string;
  failReasonMessage?: string;
  customerName?: string;
  customerDocumentNumber?: string;
}

export interface AsaasAccount {
  balance: number;
  availableBalance: number;
}

// Status de pagamento
export const PAYMENT_STATUS = {
  PENDING: "PENDING",        // Aguardando pagamento
  RECEIVED: "RECEIVED",      // Recebido (pago)
  CONFIRMED: "CONFIRMED",    // Pagamento confirmado (saldo já creditado)
  OVERDUE: "OVERDUE",        // Vencido
  REFUNDED: "REFUNDED",      // Estornado
  RECEIVED_IN_CASH: "RECEIVED_IN_CASH", // Recebido em dinheiro
  REFUND_REQUESTED: "REFUND_REQUESTED", // Estorno solicitado
  CHARGEBACK_REQUESTED: "CHARGEBACK_REQUESTED", // Recebido com chargeback solicitado
  CHARGEBACK_DISPUTE: "CHARGEBACK_DISPUTE", // Em disputa de chargeback
  AWAITING_CHARGEBACK_REVERSAL: "AWAITING_CHARGEBACK_REVERSAL", // Aguardando cancelamento de chargeback
  DUNNING_REQUESTED: "DUNNING_REQUESTED", // Em processo de recuperação
  DUNNING_RECEIVED: "DUNNING_RECEIVED", // Recuperado
  AWAITING_RISK_ANALYSIS: "AWAITING_RISK_ANALYSIS", // Pagamento em análise
};

export interface CreatePaymentRequest {
  customer: string;
  billingType: "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED";
  value: number;
  dueDate: string;
  description: string;
  externalReference?: string;
  creditCard?: CreditCardInfo;
  creditCardHolderInfo?: CreditCardHolderInfo;
  creditCardToken?: string;
  remoteIp?: string;
}

interface CreditCardInfo {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

interface CreditCardHolderInfo {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  phone: string;
}

export interface CreateCustomerRequest {
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
}

// Função para criar ou obter um cliente no Asaas
export async function createOrGetCustomer(customerData: CreateCustomerRequest): Promise<AsaasCustomer> {
  try {
    // Verificar se o cliente já existe pelo CPF/CNPJ
    const existingCustomers = await getCustomerByCpfCnpj(customerData.cpfCnpj);
    
    if (existingCustomers && existingCustomers.length > 0) {
      return existingCustomers[0];
    }
    
    // Se não existir, criar novo cliente
    const response = await fetch(`${ASAAS_BASE_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY || ''
      },
      body: JSON.stringify(customerData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ao criar cliente no Asaas: ${JSON.stringify(errorData)}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Erro no serviço Asaas:", error);
    throw error;
  }
}

// Função para buscar um cliente pelo CPF/CNPJ
export async function getCustomerByCpfCnpj(cpfCnpj: string): Promise<AsaasCustomer[]> {
  try {
    const response = await fetch(`${ASAAS_BASE_URL}/customers?cpfCnpj=${cpfCnpj}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY || ''
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ao buscar cliente no Asaas: ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Erro no serviço Asaas:", error);
    throw error;
  }
}

// Função para criar um pagamento no Asaas
export async function createPayment(paymentData: CreatePaymentRequest): Promise<AsaasPayment> {
  try {
    const response = await fetch(`${ASAAS_BASE_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY || ''
      },
      body: JSON.stringify(paymentData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ao criar pagamento no Asaas: ${JSON.stringify(errorData)}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Erro no serviço Asaas:", error);
    throw error;
  }
}

// Função para listar pagamentos
export async function listPayments(filters?: Record<string, string>): Promise<AsaasPayment[]> {
  try {
    let url = `${ASAAS_BASE_URL}/payments`;
    
    // Adicionar filtros à URL, se fornecidos
    if (filters && Object.keys(filters).length > 0) {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        queryParams.append(key, value);
      });
      url += `?${queryParams.toString()}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY || ''
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ao listar pagamentos no Asaas: ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Erro no serviço Asaas:", error);
    throw error;
  }
}

// Função para buscar um pagamento pelo ID
export async function getPaymentById(paymentId: string): Promise<AsaasPayment> {
  try {
    const response = await fetch(`${ASAAS_BASE_URL}/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY || ''
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ao buscar pagamento no Asaas: ${JSON.stringify(errorData)}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Erro no serviço Asaas:", error);
    throw error;
  }
}

// Função para cancelar um pagamento
export async function cancelPayment(paymentId: string): Promise<AsaasPayment> {
  try {
    const response = await fetch(`${ASAAS_BASE_URL}/payments/${paymentId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY || ''
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ao cancelar pagamento no Asaas: ${JSON.stringify(errorData)}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Erro no serviço Asaas:", error);
    throw error;
  }
}

// Obter URL para pagamento via PIX (QR Code)
export async function getPixQrCode(paymentId: string): Promise<any> {
  try {
    const response = await fetch(`${ASAAS_BASE_URL}/payments/${paymentId}/pixQrCode`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY || ''
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ao obter QR Code PIX: ${JSON.stringify(errorData)}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Erro no serviço Asaas:", error);
    throw error;
  }
}

// Obter saldo da conta
export async function getAccountBalance(): Promise<AsaasAccount> {
  try {
    const response = await fetch(`${ASAAS_BASE_URL}/finance/balance`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY || ''
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ao obter saldo da conta: ${JSON.stringify(errorData)}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Erro no serviço Asaas:", error);
    throw error;
  }
}

// Atualizar status de um pagamento
export async function updatePaymentStatus(paymentId: string, status: string): Promise<AsaasPayment> {
  try {
    const response = await fetch(`${ASAAS_BASE_URL}/payments/${paymentId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY || ''
      },
      body: JSON.stringify({ status })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ao atualizar status do pagamento: ${JSON.stringify(errorData)}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Erro no serviço Asaas:", error);
    throw error;
  }
}

// Fazer transferência PIX para outra conta
export async function makePixTransfer(pixKey: string, value: number, description: string): Promise<any> {
  try {
    const response = await fetch(`${ASAAS_BASE_URL}/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY || ''
      },
      body: JSON.stringify({
        pixKey,
        value,
        description,
        pixKeyType: 'EMAIL' // Pode ser EMAIL, CPF, CNPJ, PHONE, EVP
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro ao realizar transferência PIX: ${JSON.stringify(errorData)}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Erro no serviço Asaas:", error);
    throw error;
  }
}

// Função para formatar um cliente do sistema para o formato Asaas
export function formatCustomerForAsaas(customer: any): CreateCustomerRequest {
  // Remover caracteres não numéricos do CPF/CNPJ
  const cpfCnpj = customer.document?.replace(/\D/g, '') || '';
  
  // Extrair número do endereço, se possível
  let address = customer.address || '';
  let addressNumber: string | undefined = undefined;
  
  // Tenta extrair o número do endereço (formato: "Rua X, 123")
  const addressMatch = address.match(/(.*?)(?:,\s*(\d+))?$/);
  if (addressMatch) {
    address = addressMatch[1]?.trim() || address;
    addressNumber = addressMatch[2] || undefined;
  }
  
  return {
    name: customer.name || '',
    cpfCnpj: cpfCnpj,
    email: customer.email || undefined,
    phone: customer.phone || undefined,
    mobilePhone: customer.phone || undefined,
    address: address || undefined,
    addressNumber: addressNumber || undefined,
    complement: undefined,
    province: customer.city || undefined,
    postalCode: customer.zip_code?.replace(/\D/g, '') || undefined
  };
}

// Função para adicionar dados do cliente ao pagamento
export function enrichPaymentWithCustomerInfo(payment: AsaasPayment, customer: any): AsaasPayment {
  return {
    ...payment,
    customerName: customer.name,
    customerDocumentNumber: customer.document
  };
}