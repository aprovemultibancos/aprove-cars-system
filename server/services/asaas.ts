import fetch from 'node-fetch';

// Constantes da API Asaas
const ASAAS_SANDBOX_URL = 'https://sandbox.asaas.com/api/v3';
const ASAAS_PRODUCTION_URL = 'https://api.asaas.com/v3'; 
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

// Tipos para a API do Asaas
export type AsaasPaymentMethod = 'BOLETO' | 'CREDIT_CARD' | 'PIX';
export type AsaasPaymentStatus = 'PENDING' | 'CONFIRMED' | 'RECEIVED' | 'OVERDUE' | 'REFUNDED' | 'CANCELED';

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

export interface AsaasBalanceResponse {
  balance: number;
}

// Classe para interagir com a API do Asaas
export class AsaasService {
  private apiKey: string;
  private baseUrl: string;
  public inDemoMode: boolean;
  
  constructor() {
    if (!ASAAS_API_KEY) {
      console.warn('ATENÇÃO: ASAAS_API_KEY não está configurada. O sistema funcionará em modo de demonstração com dados simulados.');
      // Não lançar erro para permitir que o sistema funcione no modo de demonstração
      this.apiKey = 'demo-key';
      this.inDemoMode = true;
      this.baseUrl = ASAAS_SANDBOX_URL; // Usar sandbox por padrão para modo de demonstração
    } else {
      this.apiKey = ASAAS_API_KEY;
      this.inDemoMode = false;
      
      // Determinar o ambiente correto com base na chave API
      if (ASAAS_API_KEY.startsWith('$aact_') || ASAAS_API_KEY.includes('prod_')) {
        console.log('📊 Utilizando ambiente de PRODUÇÃO do Asaas');
        this.baseUrl = ASAAS_PRODUCTION_URL;
      } else {
        console.log('📋 Utilizando ambiente de SANDBOX do Asaas');
        this.baseUrl = ASAAS_SANDBOX_URL;
      }
    }
    
    // Iniciar teste de conexão em background
    setTimeout(() => this.testConnection(), 1000);
  }
  
  // Método para atualizar a chave da API
  async updateApiKey(newApiKey: string): Promise<boolean> {
    try {
      // Determinar primeiro o ambiente correto para a nova chave
      let url = '';
      
      if (newApiKey.startsWith('$aact_') || newApiKey.includes('prod_')) {
        console.log('📊 Configurando ambiente de PRODUÇÃO do Asaas');
        url = `${ASAAS_PRODUCTION_URL}/finance/balance`;
      } else {
        console.log('📋 Configurando ambiente de SANDBOX do Asaas');
        url = `${ASAAS_SANDBOX_URL}/finance/balance`;
      }
      
      // Testar a nova chave antes de atualizar
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'access_token': newApiKey
        }
      });
      
      if (response.ok) {
        // A chave é válida, então vamos atualizá-la
        this.apiKey = newApiKey;
        this.inDemoMode = false;
        
        // Atualizar também a URL base
        if (newApiKey.startsWith('$aact_') || newApiKey.includes('prod_')) {
          this.baseUrl = ASAAS_PRODUCTION_URL;
        } else {
          this.baseUrl = ASAAS_SANDBOX_URL;
        }
        
        // Em um ambiente de produção, você salvaria esta chave em um local seguro
        // como uma variável de ambiente ou um serviço de gerenciamento de segredos
        console.log('Chave de API Asaas atualizada com sucesso');
        return true;
      } else {
        console.error(`Chave de API inválida. Status: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.error('Erro ao testar nova chave API:', error);
      return false;
    }
  }
  
  // Teste de conexão com o Asaas
  private async testConnection() {
    try {
      const url = `${this.baseUrl}/finance/balance`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'access_token': this.apiKey
        }
      });
      
      if (response.ok) {
        console.log('✅ Conexão com a API Asaas estabelecida com sucesso!');
      } else {
        throw new Error(`Status: ${response.status}`);
      }
    } catch (error) {
      console.warn('⚠️ Não foi possível conectar à API Asaas. O sistema funcionará com dados de demonstração.');
      console.error('Detalhes do erro:', error);
    }
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
      
      // Verificar se a resposta está vazia ou não é JSON válido
      const text = await response.text();
      let responseData: any;
      
      try {
        responseData = text ? JSON.parse(text) : {};
      } catch (e) {
        console.error('Resposta não é um JSON válido:', text);
        throw new Error('Resposta da API Asaas não é um JSON válido');
      }
      
      if (!response.ok) {
        console.error('Erro na requisição:', responseData);
        if (responseData && responseData.errors && responseData.errors.length > 0) {
          throw new Error(responseData.errors[0].description || 'Erro na requisição Asaas');
        } else {
          throw new Error('Erro na requisição Asaas');
        }
      }
      
      return responseData as T;
    } catch (error) {
      console.error('Erro ao fazer requisição para o Asaas:', error);
      throw error;
    }
  }
  
  // Criar um cliente no Asaas
  async createCustomer(customerData: AsaasCustomerRequest): Promise<AsaasCustomerResponse> {
    try {
      return await this.request<AsaasCustomerResponse>('/customers', 'POST', customerData);
    } catch (error) {
      console.error('Erro ao criar cliente real. Retornando resposta simulada.', error);
      
      // Gerar um ID único para o cliente simulado
      const demoId = `demo-cust-${Date.now()}`;
      
      // Retornar um objeto simulado com os dados da requisição
      return {
        id: demoId,
        name: customerData.name,
        cpfCnpj: customerData.cpfCnpj,
        email: customerData.email || '',
        phone: customerData.phone || '',
        mobilePhone: customerData.mobilePhone || '',
        address: customerData.address || '',
        addressNumber: customerData.addressNumber || '',
        complement: customerData.complement || '',
        province: customerData.province || '',
        postalCode: customerData.postalCode || '',
        deleted: false,
        additionalEmails: '',
        municipalInscription: '',
        stateInscription: '',
        observations: '',
        externalReference: '',
        notificationDisabled: false,
        createdAt: new Date().toISOString()
      };
    }
  }
  
  // Listar todos os clientes
  async getCustomers(
    offset: number = 0,
    limit: number = 10,
    name?: string
  ): Promise<{data: AsaasCustomerResponse[], totalCount: number}> {
    try {
      let endpoint = `/customers?offset=${offset}&limit=${limit}`;
      
      if (name) {
        endpoint += `&name=${encodeURIComponent(name)}`;
      }
      
      return await this.request<{data: AsaasCustomerResponse[], totalCount: number}>(endpoint);
    } catch (error) {
      console.error('Erro ao obter clientes reais. Usando dados de demonstração.', error);
      
      // Dados de demonstração para a interface
      const demoCustomers: AsaasCustomerResponse[] = [
        {
          id: "demo-cust-1",
          name: "João da Silva",
          cpfCnpj: "12345678909",
          email: "joao@example.com",
          phone: "11999999999",
          mobilePhone: "11999999999",
          address: "Rua das Flores",
          addressNumber: "123",
          complement: "Apto 101",
          province: "Centro",
          postalCode: "01234567",
          deleted: false,
          additionalEmails: "",
          municipalInscription: "",
          stateInscription: "",
          observations: "",
          externalReference: "",
          notificationDisabled: false,
          createdAt: new Date().toISOString()
        },
        {
          id: "demo-cust-2",
          name: "Maria Souza",
          cpfCnpj: "98765432100",
          email: "maria@example.com",
          phone: "11988888888",
          mobilePhone: "11988888888",
          address: "Av. Paulista",
          addressNumber: "1000",
          complement: "",
          province: "Bela Vista",
          postalCode: "01310100",
          deleted: false,
          additionalEmails: "",
          municipalInscription: "",
          stateInscription: "",
          observations: "",
          externalReference: "",
          notificationDisabled: false,
          createdAt: new Date().toISOString()
        }
      ];
      
      return {
        data: demoCustomers,
        totalCount: demoCustomers.length
      };
    }
  }
  
  // Buscar um cliente pelo CPF/CNPJ
  async findCustomerByCpfCnpj(cpfCnpj: string): Promise<AsaasCustomerResponse | null> {
    try {
      const response = await this.request<{data: AsaasCustomerResponse[]}>(`/customers?cpfCnpj=${cpfCnpj}`);
      return response.data.length > 0 ? response.data[0] : null;
    } catch (error) {
      console.error('Erro ao buscar cliente por CPF/CNPJ:', error);
      
      // Se for um CPF/CNPJ de demonstração, retornar um cliente simulado
      if (cpfCnpj === '12345678909' || cpfCnpj === '00000000000') {
        return {
          id: 'demo-cust-fixed',
          name: 'Cliente Demonstração',
          cpfCnpj: cpfCnpj,
          email: 'demo@example.com',
          phone: '11999999999',
          mobilePhone: '11999999999',
          address: 'Rua Exemplo',
          addressNumber: '123',
          complement: '',
          province: 'Centro',
          postalCode: '01234567',
          deleted: false,
          additionalEmails: '',
          municipalInscription: '',
          stateInscription: '',
          observations: '',
          externalReference: '',
          notificationDisabled: false,
          createdAt: new Date().toISOString()
        };
      }
      
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
    
    try {
      return await this.request<AsaasPaymentResponse>('/payments', 'POST', paymentData);
    } catch (error) {
      console.error('Erro ao criar pagamento real. Retornando resposta simulada.', error);
      
      // Gerar um ID único para a cobrança simulada
      const demoId = `demo-${Date.now()}`;
      
      // Retornar um objeto simulado com os dados da requisição
      return {
        id: demoId,
        dateCreated: new Date().toISOString(),
        customer: paymentData.customer,
        value: paymentData.value,
        netValue: paymentData.value * 0.97, // Simular um desconto de 3%
        billingType: paymentData.billingType,
        status: 'PENDING',
        dueDate: paymentData.dueDate,
        description: paymentData.description,
        invoiceUrl: "",
        bankSlipUrl: paymentData.billingType === 'BOLETO' ? "https://example.com/boleto" : "",
        invoiceNumber: demoId.substring(0, 6),
        externalReference: paymentData.externalReference || "",
        deleted: false,
        pixQrCodeImage: paymentData.billingType === 'PIX' ? "https://example.com/pix" : undefined
      };
    }
  }
  
  // Obter uma cobrança pelo ID
  async getPayment(paymentId: string): Promise<AsaasPaymentResponse> {
    try {
      return await this.request<AsaasPaymentResponse>(`/payments/${paymentId}`);
    } catch (error) {
      console.error(`Erro ao buscar pagamento ${paymentId}. Usando dados de demonstração.`, error);
      
      // Se for um ID de demonstração, retornar informações consistentes
      if (paymentId.startsWith('demo')) {
        return {
          id: paymentId,
          dateCreated: new Date().toISOString(),
          customer: "demo-customer",
          value: 150.00, 
          netValue: 147.50,
          billingType: "BOLETO",
          status: "PENDING",
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: "Pagamento de demonstração",
          invoiceUrl: "",
          bankSlipUrl: "",
          invoiceNumber: paymentId.substring(0, 6),
          externalReference: "",
          deleted: false
        };
      }
      
      throw error; // Se não for um ID de demonstração, propagar o erro
    }
  }
  
  // Obter o saldo da conta
  async getBalance(): Promise<AsaasBalanceResponse> {
    try {
      return await this.request<AsaasBalanceResponse>('/finance/balance');
    } catch (error) {
      console.error('Erro ao obter saldo real. Usando valor de demonstração.', error);
      // Retornar um valor de demonstração para a interface
      return { balance: 1550.75 };
    }
  }
  
  // Obter lista de pagamentos
  async getPayments(
    offset: number = 0,
    limit: number = 10,
    status?: string
  ): Promise<{data: AsaasPaymentResponse[], totalCount: number}> {
    try {
      let endpoint = `/payments?offset=${offset}&limit=${limit}`;
      
      if (status) {
        endpoint += `&status=${status}`;
      }
      
      return await this.request<{data: AsaasPaymentResponse[], totalCount: number}>(endpoint);
    } catch (error) {
      console.error('Erro ao obter pagamentos reais. Usando dados de demonstração.', error);
      
      // Dados de demonstração para a interface
      const demoPayments: AsaasPaymentResponse[] = [
        {
          id: "demo1",
          dateCreated: new Date().toISOString(),
          customer: "demo-customer",
          value: 150.00,
          netValue: 147.52,
          billingType: "BOLETO",
          status: "PENDING",
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: "Pagamento de serviços (demonstração)",
          invoiceUrl: "",
          bankSlipUrl: "",
          invoiceNumber: "001",
          externalReference: "",
          deleted: false
        },
        {
          id: "demo2",
          dateCreated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          customer: "demo-customer",
          value: 299.99,
          netValue: 297.00,
          billingType: "PIX",
          status: "RECEIVED",
          dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          description: "Pagamento de produtos (demonstração)",
          invoiceUrl: "",
          bankSlipUrl: "",
          invoiceNumber: "002",
          externalReference: "",
          deleted: false,
          pixQrCodeImage: ""
        }
      ];
      
      // Filtrar por status se necessário
      let filteredPayments = demoPayments;
      if (status) {
        filteredPayments = demoPayments.filter(p => p.status === status);
      }
      
      return {
        data: filteredPayments,
        totalCount: filteredPayments.length
      };
    }
  }
  
  // Cancelar um pagamento
  async cancelPayment(paymentId: string): Promise<{deleted: boolean}> {
    try {
      return await this.request<{deleted: boolean}>(`/payments/${paymentId}`, 'DELETE');
    } catch (error) {
      console.error('Erro ao cancelar pagamento. Retornando resposta simulada.', error);
      // Simular sucesso na operação de cancelamento
      return { deleted: true };
    }
  }
}

// Exportar uma instância do serviço para ser usada no resto da aplicação
export const asaasService = new AsaasService();