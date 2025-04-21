import fetch from 'node-fetch';

// Constantes da API Asaas
const ASAAS_SANDBOX_URL = 'https://sandbox.asaas.com/api/v3';
const ASAAS_PRODUCTION_URL = 'https://api.asaas.com/v3'; 
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

// Tipos para a API do Asaas
export type AsaasPaymentMethod = 'BOLETO' | 'CREDIT_CARD' | 'PIX';
export type AsaasPaymentStatus = 'PENDING' | 'CONFIRMED' | 'RECEIVED' | 'OVERDUE' | 'REFUNDED' | 'CANCELED';

export interface AsaasPaymentSplit {
  walletId: string;
  fixedValue?: number;
  percentualValue?: number;
}

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
  split?: AsaasPaymentSplit[];
}

export interface AsaasCustomerResponse {
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
  additionalEmails?: string;
  municipalInscription?: string;
  stateInscription?: string;
  observations?: string;
  externalReference?: string;
  notificationDisabled?: boolean;
  createdAt?: string;
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

import { db } from "../db";
import { companyIntegrations, companies, splitConfigs, asaasConfig } from "@shared/schema";
import { eq, and } from "drizzle-orm";

// Classe para interagir com a API do Asaas
export class AsaasService {
  private apiKey: string;
  private baseUrl: string;
  public inDemoMode: boolean;
  public currentCompanyId: number | null;
  
  constructor() {
    // Verificar se temos uma API KEY válida no ambiente
    const hasValidApiKey = ASAAS_API_KEY && ASAAS_API_KEY.trim() !== '';
    
    if (hasValidApiKey) {
      // Usar a chave de API definida no ambiente
      this.apiKey = ASAAS_API_KEY!;
      this.inDemoMode = false; // Nunca usar modo de demonstração quando temos chave válida
      
      // Definir a URL base com base no tipo de chave
      if (this.apiKey.startsWith('$aact_') || this.apiKey.includes('prod_')) {
        this.baseUrl = ASAAS_PRODUCTION_URL;
        console.log('📊 Utilizando ambiente de PRODUÇÃO do Asaas');
      } else {
        this.baseUrl = ASAAS_SANDBOX_URL;
        console.log('📋 Utilizando ambiente de SANDBOX do Asaas');
      }
    } else {
      // Sem chave de API no ambiente, começar sem configuração
      console.warn('ATENÇÃO: ASAAS_API_KEY não está configurada. O sistema buscará a configuração no banco de dados.');
      this.apiKey = 'not-configured';
      this.baseUrl = ASAAS_SANDBOX_URL;
      this.inDemoMode = true; // Começar em modo de demonstração até configurarmos
    }
    
    this.currentCompanyId = null;
    
    // Iniciar teste de conexão em background se tivermos chave
    if (hasValidApiKey) {
      setTimeout(() => this.testConnection(), 1000);
    }
  }
  
  // Método para selecionar a empresa atual
  async setCompany(companyId: number): Promise<boolean> {
    try {
      console.log(`Tentando selecionar empresa ID ${companyId} para o Asaas`);
      
      // Buscar a configuração da empresa no banco de dados
      const [config] = await db
        .select()
        .from(asaasConfig)
        .where(eq(asaasConfig.companyId, companyId));
      
      if (config) {
        console.log(`Configuração encontrada para empresa ${companyId}`);
        console.log(`Chave API: ${config.apiKey ? config.apiKey.substring(0, 5) + '...' : 'não definida'}`);
        console.log(`Modo: ${config.mode}`);
        
        // Verificar se temos uma chave válida
        if (!config.apiKey || config.apiKey === 'demo-key') {
          console.warn('⚠️ Empresa configurada com chave inválida ou vazia');
          this.inDemoMode = true;
        } else {
          this.apiKey = config.apiKey;
          this.inDemoMode = false;
          this.currentCompanyId = companyId;
          
          // Definir a URL base com base no modo configurado
          if (config.mode === 'production') {
            this.baseUrl = ASAAS_PRODUCTION_URL;
            console.log('📊 Usando ambiente de PRODUÇÃO do Asaas');
          } else {
            this.baseUrl = ASAAS_SANDBOX_URL;
            console.log('📋 Usando ambiente de SANDBOX do Asaas');
          }
          
          // Testar a conexão com a API usando a chave configurada
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
              console.warn(`⚠️ Conexão com API falhou: ${response.status}`);
              this.inDemoMode = true;
            }
          } catch (connError) {
            console.warn('⚠️ Não foi possível testar a conexão, mas continuando com a empresa selecionada');
          }
        }
        
        return true;
      } else {
        console.log(`Nenhuma configuração encontrada para empresa ${companyId}. Tentando buscar em integrações antigas...`);
        
        // Tentar buscar na tabela antiga de integrações (compatibilidade)
        const [integration] = await db
          .select()
          .from(companyIntegrations)
          .where(
            and(
              eq(companyIntegrations.companyId, companyId),
              eq(companyIntegrations.integrationType, 'asaas')
            )
          );
        
        if (integration) {
          console.log('Encontrada integração na tabela antiga. Migrando para a nova estrutura...');
          
          // Migrar da tabela antiga para a nova
          const mode = integration.apiKey.startsWith('$aact_') || integration.apiKey.includes('prod_') 
            ? 'production' 
            : 'sandbox';
          
          try {
            const insertResult = await db
              .insert(asaasConfig)
              .values({
                companyId,
                apiKey: integration.apiKey,
                mode,
                walletId: null,
              })
              .returning();
            
            console.log('Resultado da inserção:', insertResult);
            console.log('Configuração migrada com sucesso!');
            
            // Atualizar as configurações em memória
            this.apiKey = integration.apiKey;
            this.inDemoMode = false;
            this.currentCompanyId = companyId;
            
            this.baseUrl = mode === 'production' ? ASAAS_PRODUCTION_URL : ASAAS_SANDBOX_URL;
            
            return true;
          } catch (migrationError) {
            console.error('Erro ao migrar configuração:', migrationError);
          }
        } else {
          // Se não encontrar configuração e tivermos uma chave válida no ambiente
          if (ASAAS_API_KEY && ASAAS_API_KEY.trim() !== '') {
            this.apiKey = ASAAS_API_KEY;
            this.inDemoMode = false; // Nunca usar modo de demonstração com chave válida
            this.currentCompanyId = companyId; // Considerar selecionada mesmo sem configuração salva
            
            // Definir URL base com base na chave do ambiente
            if (this.apiKey.startsWith('$aact_') || this.apiKey.includes('prod_')) {
              this.baseUrl = ASAAS_PRODUCTION_URL;
              console.log(`📊 Usando ambiente de PRODUÇÃO do Asaas para empresa ${companyId} (chave do ambiente)`);
            } else {
              this.baseUrl = ASAAS_SANDBOX_URL;
              console.log(`📋 Usando ambiente de SANDBOX do Asaas para empresa ${companyId} (chave do ambiente)`);
            }
            
            console.log(`Empresa ${companyId} não possui configuração Asaas salva, mas usando chave válida do ambiente.`);
            return true;
          } else {
            // Sem configuração e sem chave válida no ambiente
            this.apiKey = 'not-configured';
            this.inDemoMode = true;
            this.currentCompanyId = null;
            this.baseUrl = ASAAS_SANDBOX_URL;
            
            console.warn(`Empresa ${companyId} não possui configuração Asaas e não há chave válida no ambiente.`);
            return false;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao definir empresa para o serviço Asaas:', error);
      if (error instanceof Error) {
        console.error('Detalhes do erro:', error.message);
        if (error.stack) console.error('Stack:', error.stack);
      }
      this.inDemoMode = true;
      return false;
    }
  }
  
  // Método para atualizar a chave da API e associá-la a uma empresa
  async updateApiKey(newApiKey: string, companyId: number = 1, walletId?: string): Promise<boolean> {
    try {
      if (!newApiKey || newApiKey.trim() === '') {
        console.error('Chave API vazia fornecida');
        return false;
      }

      // Remover espaços em branco da chave
      const cleanApiKey = newApiKey.trim();
      
      // Determinar primeiro o ambiente correto para a nova chave
      let url = '';
      const mode = cleanApiKey.startsWith('$aact_') || cleanApiKey.includes('prod_') 
        ? 'production' 
        : 'sandbox';
      
      if (mode === 'production') {
        console.log('📊 Configurando ambiente de PRODUÇÃO do Asaas');
        url = `${ASAAS_PRODUCTION_URL}/finance/balance`;
      } else {
        console.log('📋 Configurando ambiente de SANDBOX do Asaas');
        url = `${ASAAS_SANDBOX_URL}/finance/balance`;
      }
      
      console.log(`Testando chave API ${cleanApiKey.substring(0, 5)}... para empresa ${companyId}`);
      
      // Testar a nova chave antes de atualizar
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'access_token': cleanApiKey
        }
      });
      
      if (response.ok) {
        console.log('✅ Teste de API bem-sucedido!');
        
        // A chave é válida, vamos atualizá-la na memória
        this.apiKey = cleanApiKey;
        this.inDemoMode = false;
        
        // Atualizar também a URL base
        this.baseUrl = mode === 'sandbox' ? ASAAS_SANDBOX_URL : ASAAS_PRODUCTION_URL;
        
        // Atualizando ou inserindo no banco de dados
        try {
          // Verificar se já existe uma configuração
          const [existingConfig] = await db
            .select()
            .from(asaasConfig)
            .where(eq(asaasConfig.companyId, companyId));
          
          if (existingConfig) {
            console.log('Atualizando configuração existente no banco de dados...');
            
            // Atualizar configuração existente
            const updateResult = await db
              .update(asaasConfig)
              .set({ 
                apiKey: cleanApiKey,
                mode,
                walletId,
                updatedAt: new Date()
              })
              .where(eq(asaasConfig.id, existingConfig.id))
              .returning();
            
            console.log('Resultado da atualização:', updateResult);
            console.log(`Configuração Asaas atualizada para empresa ${companyId}`);
          } else {
            console.log('Criando nova configuração no banco de dados...');
            
            // Criar nova configuração
            const insertResult = await db
              .insert(asaasConfig)
              .values({
                companyId,
                apiKey: cleanApiKey,
                mode,
                walletId,
              })
              .returning();
            
            console.log('Resultado da inserção:', insertResult);
            console.log(`Nova configuração Asaas criada para empresa ${companyId}`);
          }
          
          // Definir a empresa atual
          this.currentCompanyId = companyId;
          
          // Verificar novamente se a configuração foi salva corretamente
          const configCheck = await this.getAsaasConfig(companyId);
          if (configCheck && configCheck.apiKey === cleanApiKey) {
            console.log('✅ Verificação: Chave API salva corretamente no banco de dados');
          } else {
            console.warn('⚠️ Verificação: A chave API pode não ter sido salva corretamente');
          }
        } catch (dbError) {
          console.error('Erro ao salvar configuração Asaas no banco de dados:', dbError);
          if (dbError instanceof Error) {
            console.error('Detalhes do erro:', dbError.message);
            if (dbError.stack) console.error('Stack:', dbError.stack);
          }
          
          // Se ainda conseguimos validar a chave, retornamos true mesmo com erro no banco
          return true;
        }
        
        console.log('Chave de API Asaas atualizada com sucesso');
        return true;
      } else {
        const body = await response.text();
        console.error(`Chave de API inválida. Status: ${response.status}, Resposta: ${body}`);
        return false;
      }
    } catch (error) {
      console.error('Erro ao testar nova chave API:', error);
      if (error instanceof Error) {
        console.error('Detalhes do erro:', error.message);
        if (error.stack) console.error('Stack:', error.stack);
      }
      return false;
    }
  }
  
  // Método para obter a configuração do Asaas de uma empresa
  async getAsaasConfig(companyId: number) {
    try {
      const [config] = await db
        .select()
        .from(asaasConfig)
        .where(eq(asaasConfig.companyId, companyId));
      
      return config;
    } catch (error) {
      console.error('Erro ao buscar configuração Asaas:', error);
      return null;
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
      
      console.log(`Buscando clientes reais no Asaas: ${this.baseUrl}${endpoint}`);
      const result = await this.request<{data: AsaasCustomerResponse[], totalCount: number}>(endpoint);
      console.log(`Encontrados ${result.data.length} clientes reais no Asaas`);
      
      // Garante que exibimos dados reais, mesmo que a lista esteja vazia
      return result;
    } catch (error) {
      console.error('Erro ao obter clientes reais. Usando dados de demonstração.', error);
      
      // Somente usar demonstração se estiver explicitamente no modo de demonstração
      if (this.inDemoMode) {
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
      } else {
        // Se não estiver no modo de demonstração e ocorrer um erro, retornar uma lista vazia
        // mas mantendo a estrutura adequada para a interface
        return {
          data: [],
          totalCount: 0
        };
      }
    }
  }
  
  // Buscar um cliente pelo CPF/CNPJ
  // Este método foi removido para evitar duplicação
  // Use o método findCustomerByCpfCnpj implementado mais abaixo no código
  
  // Criar uma cobrança com as taxas aplicadas e splitamento para empresa master
  async createPayment(
    paymentData: AsaasPaymentRequest,
    includeCustomFees: boolean = true
  ): Promise<AsaasPaymentResponse> {
    try {
      console.log('Iniciando criação de pagamento no Asaas...');
      console.log('Estado atual do serviço:');
      console.log(`- API Key: ${this.apiKey ? this.apiKey.substring(0, 5) + '...' : 'não definida'}`);
      console.log(`- URL base: ${this.baseUrl}`);
      console.log(`- Modo de demonstração: ${this.inDemoMode ? 'Sim' : 'Não'}`);
      console.log(`- Empresa atual: ${this.currentCompanyId || 'não definida'}`);
      
      // Validar os dados básicos do pagamento
      if (!paymentData.customer) {
        throw new Error('ID do cliente não fornecido para o pagamento');
      }
      
      if (!paymentData.value || paymentData.value <= 0) {
        throw new Error('Valor do pagamento inválido');
      }
      
      if (!paymentData.dueDate) {
        throw new Error('Data de vencimento não fornecida');
      }
      
      // Aplicar taxas personalizadas se solicitado
      let originalValue = paymentData.value;
      if (includeCustomFees) {
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
      
      // Verificar se API key está configurada
      if (this.inDemoMode || this.apiKey === 'demo-key' || !this.apiKey) {
        console.warn('⚠️ Sistema em modo de demonstração. Impossível criar pagamento real.');
        console.warn('⚠️ É necessário configurar a chave API do Asaas.');
        
        // Gerar um ID único para a cobrança simulada
        const demoId = `demo-${Date.now()}`;
        console.warn('Gerando pagamento de demonstração:', demoId);
        
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
          description: paymentData.description || 'Pagamento (simulado)',
          invoiceUrl: "",
          bankSlipUrl: paymentData.billingType === 'BOLETO' ? "https://example.com/boleto" : "",
          invoiceNumber: demoId.substring(0, 6),
          externalReference: paymentData.externalReference || "",
          deleted: false,
          pixQrCodeImage: paymentData.billingType === 'PIX' ? "https://example.com/pix" : undefined
        };
      }
      
      // Verificar se precisa adicionar split para empresa master
      let paymentDataWithSplit = { ...paymentData };
      
      // Só aplicar split se temos uma empresa definida e não é a master
      if (this.currentCompanyId) {
        try {
          // Consultar a empresa atual
          const [company] = await db
            .select()
            .from(companies)
            .where(eq(companies.id, this.currentCompanyId));
          
          // Se a empresa não for master e tiver uma empresa mãe configurada
          if (company && !company.isMaster && company.masterCompanyId) {
            // Buscar a configuração de splitamento
            const [splitConfig] = await db
              .select()
              .from(splitConfigs)
              .where(
                and(
                  eq(splitConfigs.companyId, this.currentCompanyId),
                  eq(splitConfigs.isActive, true)
                )
              );
            
            // Buscar a configuração Asaas da empresa master
            const [masterConfig] = await db
              .select()
              .from(asaasConfig)
              .where(eq(asaasConfig.companyId, company.masterCompanyId));
            
            // Se temos a configuração de split e a configuração da master
            if (splitConfig && masterConfig && masterConfig.walletId) {
              const masterPercentage = parseFloat(splitConfig.masterPercentage.toString());
              
              // Calcular o valor para a empresa master (porcentagem do valor total)
              const masterAmount = paymentData.value * (masterPercentage / 100);
              
              // Adicionar configuração de split ao pagamento
              paymentDataWithSplit = {
                ...paymentData,
                split: [
                  {
                    walletId: masterConfig.walletId!,
                    fixedValue: parseFloat(masterAmount.toFixed(2))
                  }
                ]
              };
              
              console.log(`Split configurado: ${masterPercentage}% (R$ ${masterAmount.toFixed(2)}) para empresa master ${company.masterCompanyId}`);
            } else {
              console.log('Configuração de split ou configuração Asaas da empresa master não encontrada');
              console.log('Continuando sem split de pagamento');
            }
          }
        } catch (splitError) {
          console.error('Erro ao aplicar split:', splitError);
          if (splitError instanceof Error) {
            console.error('Detalhes do erro:', splitError.message);
          }
          // Continuar com o pagamento sem split em caso de erro
          console.log('Continuando sem split de pagamento devido ao erro');
        }
      }
      
      // Log detalhado dos dados enviados
      console.log('Dados de pagamento sendo enviados para o Asaas:');
      console.log(JSON.stringify(paymentDataWithSplit, null, 2));
      
      // Criar o pagamento real
      const result = await this.request<AsaasPaymentResponse>('/payments', 'POST', paymentDataWithSplit);
      
      console.log('✅ Pagamento criado com sucesso no Asaas!');
      console.log(`- ID do pagamento: ${result.id}`);
      console.log(`- Valor: R$ ${result.value.toFixed(2)}`);
      console.log(`- Status: ${result.status}`);
      
      return result;
    } catch (error) {
      console.error('❌ Erro ao criar pagamento no Asaas:', error);
      if (error instanceof Error) {
        console.error('Detalhes do erro:', error.message);
        if (error.stack) console.error('Stack:', error.stack);
      }
      
      // Se for um erro com a API e estiver em produção, retornar dados de demonstração
      if (this.apiKey === 'demo-key' || this.inDemoMode || !this.apiKey) {
        console.warn('Criando pagamento de demonstração como fallback...');
        const demoId = `demo-${Date.now()}`;
        
        return {
          id: demoId,
          dateCreated: new Date().toISOString(),
          customer: paymentData.customer,
          value: paymentData.value,
          netValue: paymentData.value * 0.97,
          billingType: paymentData.billingType,
          status: 'PENDING',
          dueDate: paymentData.dueDate,
          description: paymentData.description || 'Pagamento (simulado)',
          invoiceUrl: "",
          bankSlipUrl: "",
          invoiceNumber: demoId.substring(0, 6),
          externalReference: paymentData.externalReference || "",
          deleted: false
        };
      }
      
      // Se temos API key válida mas ocorreu erro, propagar o erro
      throw error;
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
      
      console.log(`Buscando pagamentos reais no Asaas: ${this.baseUrl}${endpoint}`);
      const result = await this.request<{data: AsaasPaymentResponse[], totalCount: number}>(endpoint);
      console.log(`Encontrados ${result.data.length} pagamentos reais no Asaas`);
      
      // Garantir que sempre retornamos os dados reais, mesmo que seja uma lista vazia
      return result;
    } catch (error) {
      console.error('Erro ao obter pagamentos reais. Verificando modo de demonstração...', error);
      
      // Somente usar demonstração se estiver explicitamente no modo de demonstração
      if (this.inDemoMode) {
        console.log('Usando dados de demonstração para pagamentos');
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
      } else {
        console.log('API Asaas indisponível, mas não estamos em modo de demonstração. Retornando lista vazia.');
        // Se não estiver no modo de demonstração e ocorrer um erro, retornar uma lista vazia
        // mas mantendo a estrutura adequada para a interface
        return {
          data: [],
          totalCount: 0
        };
      }
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
  
  // Método para buscar clientes por CPF/CNPJ
  async findCustomerByCpfCnpj(cpfCnpj: string): Promise<AsaasCustomerResponse | null> {
    try {
      // Validar se recebemos o CPF/CNPJ
      if (!cpfCnpj) {
        console.error('CPF/CNPJ não fornecido');
        return null;
      }
      
      // Verificar estado da conexão com Asaas
      if (this.inDemoMode || !this.apiKey || this.apiKey === 'demo-key') {
        console.warn('Serviço Asaas em modo demo ou API key não configurada.');
        console.warn('Retornando NULL para forçar cadastro manual do cliente.');
        // Não retornamos mais cliente de demonstração, forçando o usuário a cadastrar o cliente
        return null;
      }
      
      // Remover caracteres não numéricos do CPF/CNPJ
      const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '');
      console.log(`Buscando cliente com CPF/CNPJ: ${cleanCpfCnpj}`);
      
      // Fazer requisição para API
      const response = await this.request<{ data: AsaasCustomerResponse[] }>(
        `/customers?cpfCnpj=${cleanCpfCnpj}`
      );
      
      console.log(`Resposta da API: ${response.data.length} cliente(s) encontrado(s)`);
      
      if (response.data.length > 0) {
        console.log(`Cliente encontrado: ${response.data[0].name} (ID: ${response.data[0].id})`);
        return response.data[0];
      } else {
        console.log('Nenhum cliente encontrado com este CPF/CNPJ');
        return null;
      }
    } catch (error) {
      console.error('Erro ao buscar cliente por CPF/CNPJ:', error);
      if (error instanceof Error) {
        console.error('Detalhes do erro:', error.message);
        if (error.stack) console.error('Stack:', error.stack);
      }
      
      return null;
    }
  }
}

// Exportar uma instância do serviço para ser usada no resto da aplicação
export const asaasService = new AsaasService();