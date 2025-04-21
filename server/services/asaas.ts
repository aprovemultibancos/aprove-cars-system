import fetch from 'node-fetch';

// Constantes da API Asaas
const ASAAS_BASE_URL = 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

// Tipos para a API do Asaas
export type AsaasPaymentMethod = 'BOLETO' | 'CREDIT_CARD' | 'PIX';

export interface AsaasPaymentRequest {
  customer: string;
  billingType: AsaasPaymentMethod;
  value: number;
  dueDate: string;
  description: string;
  externalReference?: string;
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    addressComplement?: string;
    phone: string;
  };
}

export interface AsaasCustomerRequest {
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

export interface AsaasCustomerResponse {
  id: string;
  name: string;
  cpfCnpj: string;
  email: string;
  phone: string;
  mobilePhone: string;
  address: string;
  addressNumber: string;
  complement: string;
  province: string;
  postalCode: string;
  deleted: boolean;
  additionalEmails: string;
  municipalInscription: string;
  stateInscription: string;
  observations: string;
  externalReference: string;
  notificationDisabled: boolean;
  createdAt: string;
}

export interface AsaasPaymentResponse {
  id: string;
  dateCreated: string;
  customer: string;
  value: number;
  netValue: number;
  billingType: AsaasPaymentMethod;
  status: 'PENDING' | 'CONFIRMED' | 'RECEIVED' | 'OVERDUE' | 'REFUNDED' | 'CANCELED';
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

export interface AsaasBalanceResponse {
  balance: number;
}

// Classe para interagir com a API do Asaas
export class AsaasService {
  private apiKey: string;
  private baseUrl: string;
  
  constructor() {
    if (!ASAAS_API_KEY) {
      throw new Error('ASAAS_API_KEY não está configurada');
    }
    
    this.apiKey = ASAAS_API_KEY;
    this.baseUrl = ASAAS_BASE_URL;
  }
  
  // Método para fazer requisições para a API do Asaas
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: object
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const options: any = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'access_token': this.apiKey
      }
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }
    
    try {
      console.log(`Realizando requisição ${method} para ${url}`);
      if (data) {
        console.log('Dados da requisição:', JSON.stringify(data, null, 2));
      }
      
      const response = await fetch(url, options);
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('Erro na requisição:', responseData);
        throw new Error(responseData.errors?.[0]?.description || 'Erro na requisição Asaas');
      }
      
      return responseData as T;
    } catch (error) {
      console.error('Erro ao fazer requisição para o Asaas:', error);
      throw error;
    }
  }
  
  // Criar um cliente no Asaas
  async createCustomer(customerData: AsaasCustomerRequest): Promise<AsaasCustomerResponse> {
    return this.request<AsaasCustomerResponse>('/customers', 'POST', customerData);
  }
  
  // Buscar um cliente pelo CPF/CNPJ
  async findCustomerByCpfCnpj(cpfCnpj: string): Promise<AsaasCustomerResponse | null> {
    try {
      const response = await this.request<{data: AsaasCustomerResponse[]}>(`/customers?cpfCnpj=${cpfCnpj}`);
      return response.data.length > 0 ? response.data[0] : null;
    } catch (error) {
      console.error('Erro ao buscar cliente por CPF/CNPJ:', error);
      return null;
    }
  }
  
  // Criar uma cobrança com as taxas aplicadas
  async createPayment(
    paymentData: AsaasPaymentRequest,
    includeCustomFees: boolean = true
  ): Promise<AsaasPaymentResponse> {
    // Aplicar taxas personalizadas se solicitado
    if (includeCustomFees) {
      const originalValue = paymentData.value;
      
      // Aplicar taxas com base no método de pagamento
      switch (paymentData.billingType) {
        case 'CREDIT_CARD':
          // Adicionar 1,50% de taxa para pagamentos com cartão de crédito
          paymentData.value = originalValue * 1.015;
          break;
        case 'BOLETO':
          // Adicionar R$ 1,99 de taxa para boletos
          paymentData.value = originalValue + 1.99;
          break;
        case 'PIX':
          // Adicionar 0,99% de taxa para PIX
          paymentData.value = originalValue * 1.0099;
          break;
      }
      
      // Arredondar para 2 casas decimais
      paymentData.value = Math.round(paymentData.value * 100) / 100;
      
      console.log(`Valor original: R$ ${originalValue.toFixed(2)}, Valor com taxa: R$ ${paymentData.value.toFixed(2)}`);
    }
    
    return this.request<AsaasPaymentResponse>('/payments', 'POST', paymentData);
  }
  
  // Obter uma cobrança pelo ID
  async getPayment(paymentId: string): Promise<AsaasPaymentResponse> {
    return this.request<AsaasPaymentResponse>(`/payments/${paymentId}`);
  }
  
  // Obter o saldo da conta
  async getBalance(): Promise<AsaasBalanceResponse> {
    return this.request<AsaasBalanceResponse>('/finance/balance');
  }
  
  // Obter lista de pagamentos
  async getPayments(
    offset: number = 0,
    limit: number = 10,
    status?: string
  ): Promise<{data: AsaasPaymentResponse[], totalCount: number}> {
    let endpoint = `/payments?offset=${offset}&limit=${limit}`;
    
    if (status) {
      endpoint += `&status=${status}`;
    }
    
    return this.request<{data: AsaasPaymentResponse[], totalCount: number}>(endpoint);
  }
  
  // Cancelar um pagamento
  async cancelPayment(paymentId: string): Promise<{deleted: boolean}> {
    return this.request<{deleted: boolean}>(`/payments/${paymentId}`, 'DELETE');
  }
}

// Exportar uma instância do serviço para ser usada no resto da aplicação
export const asaasService = new AsaasService();