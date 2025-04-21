// Este arquivo serve como um adaptador para manter a compatibilidade
// com o código existente, mas internamente usa a nova implementação WPPConnect

import { 
  WhatsappConnection,
  WhatsappContact,
  WhatsappTemplate,
  WhatsappCampaign,
  WhatsappGroup
} from '@shared/schema';

import { 
  WhatsappSessionHandler as WPPConnectSessionHandler,
  WPPConnectService,
  wppConnectService
} from './wppconnect-service';

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
 * Classe adaptadora para compatibilidade da interface anterior com o novo WPPConnect
 */
export class WhatsappSessionHandler {
  private wppHandler: WPPConnectSessionHandler;

  constructor(connectionInfo: WhatsappConnection) {
    this.wppHandler = wppConnectService.registerConnection(connectionInfo);
    
    // Encaminhar eventos da implementação WPPConnect
    this.wppHandler.on('qrCode', (qrCode) => {
      console.log('Recebido QR Code de WPPConnect, encaminhando como qrCode');
      // A API anterior esperava o evento 'qrCode', não 'qr'
      this.wppHandler.emit('qrCode', qrCode);
    });
  }

  /**
   * Conecta ao WhatsApp usando WPPConnect
   */
  public connect(): void {
    this.wppHandler.connect();
  }

  /**
   * Desconecta do WhatsApp
   */
  public disconnect(): void {
    this.wppHandler.disconnect();
  }

  /**
   * Envia mensagem para o número especificado
   */
  public async sendMessage(message: WhatsappMessage): Promise<string> {
    return this.wppHandler.sendMessage(message);
  }

  /**
   * Retorna o código QR para escanear no WhatsApp
   */
  public getQrCode(): string {
    return this.wppHandler.getQrCode();
  }

  /**
   * Retorna o status atual da conexão
   */
  public getStatus(): string {
    return this.wppHandler.getStatus();
  }

  /**
   * Adiciona um listener de eventos
   */
  public on(event: string, listener: (...args: any[]) => void): this {
    this.wppHandler.on(event, listener);
    return this;
  }

  /**
   * Remove um listener de eventos
   */
  public off(event: string, listener: (...args: any[]) => void): this {
    this.wppHandler.off(event, listener);
    return this;
  }

  /**
   * Emite um evento
   */
  public emit(event: string, ...args: any[]): boolean {
    return this.wppHandler.emit(event, ...args);
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
    const wppHandler = wppConnectService.getConnection(id);
    
    if (!wppHandler) {
      return null;
    }
    
    // Não temos como recuperar o objeto WhatsappConnection original,
    // então criamos um objeto mínimo para satisfazer o construtor
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
  }

  /**
   * Remove uma conexão
   */
  public removeConnection(id: number): boolean {
    return wppConnectService.removeConnection(id);
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
    await wppConnectService.sendCampaign(campaign, template, contacts);
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
    const wppHandler = wppConnectService.getConnection(connectionId);
    if (!wppHandler) {
      throw new Error(`Conexão ${connectionId} não encontrada`);
    }
    
    return wppHandler.getContacts();
  }
  
  /**
   * Verifica se um número está no WhatsApp
   */
  public async checkNumberStatus(connectionId: number, phoneNumber: string): Promise<boolean> {
    const wppHandler = wppConnectService.getConnection(connectionId);
    if (!wppHandler) {
      throw new Error(`Conexão ${connectionId} não encontrada`);
    }
    
    return wppHandler.checkNumberStatus(phoneNumber);
  }
  
  /**
   * Cria um novo grupo no WhatsApp
   */
  public async createGroup(connectionId: number, name: string, participants: string[]): Promise<any> {
    const wppHandler = wppConnectService.getConnection(connectionId);
    if (!wppHandler) {
      throw new Error(`Conexão ${connectionId} não encontrada`);
    }
    
    return wppHandler.createGroup(name, participants);
  }
}

// Exportar a instância do serviço
export const whatsappService = WhatsappService.getInstance();