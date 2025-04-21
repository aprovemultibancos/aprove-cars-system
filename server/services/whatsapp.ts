// Este arquivo serve como um adaptador para manter a compatibilidade
// com o código existente, mas internamente usa a nova implementação WPPConnect
// com a capacidade de alternar entre conexão direta e via servidor

import { EventEmitter } from 'events';
import { 
  WhatsappConnection,
  WhatsappContact,
  WhatsappTemplate,
  WhatsappCampaign,
  WhatsappGroup
} from '@shared/schema';

import { WPPConnectIntegration, WPPConnectIntegrationFactory } from './wppconnect-integration';

// Definir nossos próprios tipos que usaremos para manter compatibilidade
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface MessageStatusEvent {
  id: string;
  to: string;
  status: MessageStatus;
  timestamp: number;
  error?: string;
}

// Interface para mensagens WhatsApp
export interface WhatsappMessage {
  type: 'text' | 'image' | 'video' | 'document' | 'audio';
  to: string;
  content: string;
  mediaUrl?: string;
  caption?: string;
  filename?: string;
}

/**
 * Classe adaptadora para compatibilidade da interface anterior com a nova integração WPPConnect
 */
export class WhatsappSessionHandler {
  private integration: WPPConnectIntegration;
  private _emitter = new EventEmitter();

  constructor(connectionInfo: WhatsappConnection) {
    // Forçar modo direto (sempre conectar diretamente, não via servidor)
    this.integration = WPPConnectIntegrationFactory.getInstance(connectionInfo, 'direct');
    
    // Encaminhar eventos da implementação WPPConnect
    this.integration.on('qrCode', (qrCode) => {
      console.log('Recebido QR Code da integração WPPConnect');
      this._emitter.emit('qrCode', qrCode);
    });
    
    this.integration.on('connected', () => {
      console.log('Conexão WhatsApp estabelecida');
      this._emitter.emit('connected');
    });
    
    this.integration.on('disconnected', () => {
      console.log('Conexão WhatsApp encerrada');
      this._emitter.emit('disconnected');
    });
  }

  /**
   * Conecta ao WhatsApp usando integração WPPConnect
   */
  public connect(): void {
    this.integration.connect().catch(error => {
      console.error('Erro ao conectar ao WhatsApp:', error);
    });
  }

  /**
   * Desconecta do WhatsApp
   */
  public disconnect(): void {
    this.integration.disconnect().catch(error => {
      console.error('Erro ao desconectar do WhatsApp:', error);
    });
  }

  /**
   * Envia mensagem para o número especificado
   */
  public async sendMessage(message: WhatsappMessage): Promise<string> {
    const result = await this.integration.sendMessage(message);
    return result || `msg_${Date.now()}`;
  }

  /**
   * Verifica se um número existe no WhatsApp
   */
  public async checkNumberStatus(phoneNumber: string): Promise<boolean> {
    return this.integration.checkNumberStatus(phoneNumber);
  }

  /**
   * Retorna o código QR para escanear no WhatsApp
   */
  public getQrCode(): string {
    return this.integration.getQrCode();
  }

  /**
   * Retorna o status atual da conexão
   */
  public getStatus(): string {
    return this.integration.getStatus();
  }

  /**
   * Adiciona um listener de eventos
   */
  public on(event: string, listener: (...args: any[]) => void): this {
    this._emitter.on(event, listener);
    return this;
  }

  /**
   * Remove um listener de eventos
   */
  public off(event: string, listener: (...args: any[]) => void): this {
    this._emitter.off(event, listener);
    return this;
  }

  /**
   * Emite um evento
   */
  public emit(event: string, ...args: any[]): boolean {
    return this._emitter.emit(event, ...args);
  }
  
  /**
   * Obtém os contatos do WhatsApp
   * Método stub que será implementado posteriormente
   */
  public async getContacts(): Promise<any[]> {
    // No futuro, implementar usando this.integration
    return [];
  }
  
  /**
   * Cria um grupo no WhatsApp
   * Método stub que será implementado posteriormente
   */
  public async createGroup(name: string, participants: string[]): Promise<any> {
    // No futuro, implementar usando this.integration
    return { error: 'Não implementado' };
  }
}

/**
 * Classe adaptadora para o serviço WhatsApp
 */
export class WhatsappService {
  private static instance: WhatsappService;

  private constructor() {}

  /**
   * Retorna a instância única do serviço (Singleton)
   */
  public static getInstance(): WhatsappService {
    if (!WhatsappService.instance) {
      WhatsappService.instance = new WhatsappService();
    }
    return WhatsappService.instance;
  }

  /**
   * Registra uma conexão WhatsApp
   */
  public registerConnection(connection: WhatsappConnection): WhatsappSessionHandler {
    // Criar um adaptador que encapsula o handler WPPConnect
    return new WhatsappSessionHandler(connection);
  }

  /**
   * Obtém uma conexão pelo ID
   */
  public getConnection(id: number): WhatsappSessionHandler | null {
    try {
      // Criamos um objeto mínimo para satisfazer o construtor
      const dummyConnection: WhatsappConnection = {
        id,
        name: `Connection ${id}`,
        phoneNumber: '',
        companyId: 0,
        createdAt: new Date(),
        status: 'disconnected',
        dailyLimit: null,
        qrCode: null,
        lastConnection: null
      };
      
      return new WhatsappSessionHandler(dummyConnection);
    } catch (error) {
      console.error(`Erro ao obter conexão ${id}:`, error);
      return null;
    }
  }

  /**
   * Remove uma conexão
   */
  public removeConnection(id: number): boolean {
    try {
      return WPPConnectIntegrationFactory.removeInstance(id);
    } catch (error) {
      console.error(`Erro ao remover conexão ${id}:`, error);
      return false;
    }
  }

  /**
   * Envia uma mensagem de texto simples
   */
  public async sendTextMessage(
    connectionId: number, 
    to: string, 
    content: string
  ): Promise<string | null> {
    const handler = this.getConnection(connectionId);
    
    if (!handler) {
      console.error(`Conexão ${connectionId} não encontrada`);
      return null;
    }
    
    try {
      return await handler.sendMessage({
        type: 'text',
        to,
        content
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem de texto:', error);
      return null;
    }
  }

  /**
   * Envia uma imagem
   */
  public async sendImageMessage(
    connectionId: number,
    to: string,
    mediaUrl: string,
    caption?: string
  ): Promise<string | null> {
    const handler = this.getConnection(connectionId);
    
    if (!handler) {
      console.error(`Conexão ${connectionId} não encontrada`);
      return null;
    }
    
    try {
      return await handler.sendMessage({
        type: 'image',
        to,
        content: '',
        mediaUrl,
        caption
      });
    } catch (error) {
      console.error('Erro ao enviar imagem:', error);
      return null;
    }
  }

  /**
   * Envia um documento
   */
  public async sendDocumentMessage(
    connectionId: number,
    to: string,
    mediaUrl: string,
    filename: string
  ): Promise<string | null> {
    const handler = this.getConnection(connectionId);
    
    if (!handler) {
      console.error(`Conexão ${connectionId} não encontrada`);
      return null;
    }
    
    try {
      return await handler.sendMessage({
        type: 'document',
        to,
        content: '',
        mediaUrl,
        filename
      });
    } catch (error) {
      console.error('Erro ao enviar documento:', error);
      return null;
    }
  }

  /**
   * Processa uma mensagem de template para um contato
   * Substitui variáveis como {{nome}} pelos valores dos dados do contato
   */
  private processTemplate(template: string, contactData: any): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const trimmedKey = key.trim();
      return contactData[trimmedKey] !== undefined ? contactData[trimmedKey] : match;
    });
  }

  /**
   * Envia uma campanha para um grupo de contatos
   */
  public async sendCampaign(
    campaign: WhatsappCampaign,
    template: WhatsappTemplate,
    contacts: WhatsappContact[],
    connectionId: number
  ): Promise<void> {
    const connection = this.getConnection(connectionId);
    if (!connection) {
      throw new Error(`Conexão ${connectionId} não encontrada`);
    }
    
    // Enviar a mensagem para cada contato
    for (const contact of contacts) {
      try {
        // Processar o template com os dados do contato
        const processedContent = this.processTemplate(template.content, contact);
        
        // Enviar a mensagem
        await connection.sendMessage({
          type: template.mediaType || 'text',
          to: contact.phoneNumber,
          content: processedContent,
          mediaUrl: template.mediaUrl || undefined,
          caption: template.content // Se for mídia, usa o conteúdo como legenda
        });
        
        // Aguardar um intervalo para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Erro ao enviar mensagem para ${contact.phoneNumber}:`, error);
      }
    }
  }

  /**
   * Formata um número de telefone para o formato internacional
   */
  private formatPhoneNumber(phone: string): string {
    // Remover caracteres não numéricos
    let cleaned = phone.replace(/\D/g, '');
    
    // Verificar se já tem código do país
    if (!cleaned.startsWith('55')) {
      cleaned = '55' + cleaned;
    }
    
    return cleaned;
  }
  
  /**
   * Recupera os contatos do WhatsApp
   */
  public async getContacts(connectionId: number): Promise<any[]> {
    const handler = this.getConnection(connectionId);
    if (!handler) {
      throw new Error(`Conexão ${connectionId} não encontrada`);
    }
    
    return handler.getContacts();
  }
  
  /**
   * Verifica se um número está no WhatsApp
   */
  public async checkNumberStatus(connectionId: number, phoneNumber: string): Promise<boolean> {
    const handler = this.getConnection(connectionId);
    if (!handler) {
      throw new Error(`Conexão ${connectionId} não encontrada`);
    }
    
    return handler.checkNumberStatus(phoneNumber);
  }
  
  /**
   * Cria um novo grupo no WhatsApp
   */
  public async createGroup(connectionId: number, name: string, participants: string[]): Promise<any> {
    const handler = this.getConnection(connectionId);
    if (!handler) {
      throw new Error(`Conexão ${connectionId} não encontrada`);
    }
    
    return handler.createGroup(name, participants);
  }
}

// Exportar a instância do serviço
export const whatsappService = WhatsappService.getInstance();