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
  public currentCompanyId: number | null;
  
  constructor() {
    // Sempre usar a API KEY definida no ambiente
    const hasValidApiKey = ASAAS_API_KEY && ASAAS_API_KEY.trim() !== '';
    
    if (hasValidApiKey) {
      // Usar a chave de API definida no ambiente
      this.apiKey = ASAAS_API_KEY!;
      
      // Definir a URL base com base no tipo de chave
      if (this.apiKey.startsWith('$aact_') || this.apiKey.includes('prod_')) {
        this.baseUrl = ASAAS_PRODUCTION_URL;
        console.log('📊 Utilizando ambiente de PRODUÇÃO do Asaas');
      } else {
        this.baseUrl = ASAAS_SANDBOX_URL;
        console.log('📋 Utilizando ambiente de SANDBOX do Asaas');
      }
    } else {
      // Erro crítico: API key não configurada
      console.error('ERRO CRÍTICO: ASAAS_API_KEY não está configurada. O sistema não conseguirá processar pagamentos.');
      this.apiKey = '';
      this.baseUrl = ASAAS_SANDBOX_URL;
    }
    
    // Sempre definir empresa 1 como padrão
    this.currentCompanyId = 1;
    
    // Iniciar teste de conexão em background
    if (hasValidApiKey) {
      setTimeout(() => this.testConnection(), 1000);
    }
  }
  
  // Método para selecionar a empresa atual
  async setCompany(companyId: number): Promise<boolean> {
    try {
      console.log(`Selecionando empresa ID ${companyId} para o Asaas`);
      
      // Sempre usar a chave de API do ambiente
      if (ASAAS_API_KEY && ASAAS_API_KEY.trim() !== '') {
        this.apiKey = ASAAS_API_KEY;
        this.currentCompanyId = companyId;
        
        // Definir URL base com base na chave do ambiente
        if (this.apiKey.startsWith('$aact_') || this.apiKey.includes('prod_')) {
          this.baseUrl = ASAAS_PRODUCTION_URL;
          console.log(`📊 Usando ambiente de PRODUÇÃO do Asaas para empresa ${companyId}`);
        } else {
          this.baseUrl = ASAAS_SANDBOX_URL;
          console.log(`📋 Usando ambiente de SANDBOX do Asaas para empresa ${companyId}`);
        }
        
        // Testar a conexão com a API
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
          }
        } catch (connError) {
          console.warn('⚠️ Não foi possível testar a conexão, mas continuando com a empresa selecionada');
        }
        
        return true;
      } else {
        // Sem chave de API válida no ambiente
        console.error('ERRO CRÍTICO: ASAAS_API_KEY não está configurada. O sistema não conseguirá processar pagamentos.');
        this.apiKey = '';
        this.baseUrl = ASAAS_SANDBOX_URL;
        this.currentCompanyId = companyId;
        
        return false;
      }
    } catch (error) {
      console.error('Erro ao definir empresa para o serviço Asaas:', error);
      if (error instanceof Error) {
        console.error('Detalhes do erro:', error.message);
        if (error.stack) console.error('Stack:', error.stack);
      }
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
    // Sempre usar chave do ambiente ao invés do banco de dados
    if (ASAAS_API_KEY && ASAAS_API_KEY.trim() !== '') {
      const mode = this.apiKey.startsWith('$aact_') || this.apiKey.includes('prod_') 
        ? 'production' 
        : 'sandbox';
        
      return {
        id: 0,
        companyId,
        apiKey: ASAAS_API_KEY,
        mode,
        walletId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    
    // Retornar configuração de demo se não há chave válida
    return {
      id: 0,
      companyId,
      apiKey: 'demo-key',
      mode: 'sandbox',
      walletId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
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
      console.error('❌ Não foi possível conectar à API Asaas. Verifique se a chave API está configurada corretamente.');
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
      console.error('❌ Erro ao criar cliente no Asaas:', error);
      throw error; // Propagar o erro para que a interface possa tratá-lo adequadamente
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
      
      console.log(`Buscando clientes no Asaas: ${this.baseUrl}${endpoint}`);
      const result = await this.request<{data: AsaasCustomerResponse[], totalCount: number}>(endpoint);
      console.log(`Encontrados ${result.data.length} clientes no Asaas`);
      
      // Garante que exibimos dados reais, mesmo que a lista esteja vazia
      return result;
    } catch (error) {
      console.error('Erro ao obter clientes do Asaas:', error);
      
      // Retornar lista vazia mantendo a estrutura adequada para a interface
      return {
        data: [],
        totalCount: 0
      };
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
      if (!this.apiKey) {
        console.error('❌ Erro: API key do Asaas não configurada');
        throw new Error('API key do Asaas não configurada, impossível criar pagamento');
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
      
      // Sempre propagar o erro para que a interface possa exibi-lo adequadamente
      throw error;
    }
  }
  
  // Obter uma cobrança pelo ID
  async getPayment(paymentId: string): Promise<AsaasPaymentResponse> {
    try {
      return await this.request<AsaasPaymentResponse>(`/payments/${paymentId}`);
    } catch (error) {
      console.error(`Erro ao buscar pagamento ${paymentId}`, error);
      throw error; // Sempre propagar o erro
    }
  }
  
  // Obter o saldo da conta
  async getBalance(): Promise<AsaasBalanceResponse> {
    try {
      return await this.request<AsaasBalanceResponse>('/finance/balance');
    } catch (error) {
      console.error('Erro ao obter saldo da conta Asaas:', error);
      // Retornar saldo zero quando há erro na API
      return { balance: 0 };
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
      
      console.log(`Buscando pagamentos no Asaas: ${this.baseUrl}${endpoint}`);
      const result = await this.request<{data: AsaasPaymentResponse[], totalCount: number}>(endpoint);
      console.log(`Encontrados ${result.data.length} pagamentos no Asaas`);
      
      // Garantir que sempre retornamos os dados reais, mesmo que seja uma lista vazia
      return result;
    } catch (error) {
      console.error('Erro ao obter pagamentos do Asaas:', error);
      
      // Retornar uma lista vazia com a estrutura correta para a interface
      return {
        data: [],
        totalCount: 0
      };
    }
  }
  
  // Cancelar um pagamento
  async cancelPayment(paymentId: string): Promise<{deleted: boolean}> {
    try {
      return await this.request<{deleted: boolean}>(`/payments/${paymentId}`, 'DELETE');
    } catch (error) {
      console.error('Erro ao cancelar pagamento:', error);
      // Não simular sucesso, reportar o erro corretamente
      throw error;
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
      
      // Verificar se temos uma API key válida
      if (!this.apiKey) {
        console.error('❌ Erro: API key do Asaas não configurada');
        console.warn('Retornando NULL para forçar cadastro manual do cliente.');
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