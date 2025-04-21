import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { 
  WhatsappConnection,
  WhatsappContact,
  WhatsappTemplate,
  WhatsappCampaign,
  WhatsappGroup
} from '@shared/schema';

// Tipo de mensagem para envio
export interface WhatsappMessage {
  type: 'text' | 'image' | 'video' | 'document' | 'audio';
  to: string;
  content: string;
  mediaUrl?: string;
  caption?: string;
  filename?: string;
}

// Status de uma mensagem enviada
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

// Interface para o evento de status de mensagem
export interface MessageStatusEvent {
  id: string;
  to: string;
  status: MessageStatus;
  timestamp: number;
  error?: string;
}

// Mapeamento de conexões WhatsApp
interface WhatsappConnectionMap {
  [id: number]: WhatsappSessionHandler;
}

/**
 * Classe para gerenciar uma conexão específica do WhatsApp
 */
export class WhatsappSessionHandler extends EventEmitter {
  private socket: WebSocket | null = null;
  private qrCode: string = '';
  private status: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private connectionInfo: WhatsappConnection;
  private messageQueue: WhatsappMessage[] = [];
  private processingQueue: boolean = false;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor(connectionInfo: WhatsappConnection) {
    super();
    this.connectionInfo = connectionInfo;
  }

  /**
   * Conecta ao WebSocket do servidor WhatsApp
   */
  public connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      console.log(`Já existe uma conexão em andamento para ${this.connectionInfo.name}`);
      return;
    }

    this.status = 'connecting';
    console.log(`Conectando ao servidor WhatsApp para ${this.connectionInfo.name}...`);

    try {
      // Neste exemplo, simulamos um servidor WhatsApp com um WebSocket local
      // Na implementação real, você conectaria a um serviço como o Telein
      const serverUrl = process.env.WHATSAPP_SERVER_URL || 'ws://localhost:8080';
      this.socket = new WebSocket(serverUrl);

      this.socket.on('open', () => {
        console.log(`Conexão WebSocket aberta para ${this.connectionInfo.name}`);
        
        // Autenticar com o servidor
        this.sendToServer({
          action: 'authenticate',
          sessionId: this.connectionInfo.id.toString(),
          phoneNumber: this.connectionInfo.phoneNumber
        });

        // Iniciar ping para manter a conexão viva
        this.startPingInterval();
        
        this.reconnectAttempts = 0;
      });

      this.socket.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleServerMessage(message);
        } catch (error) {
          console.error(`Erro ao processar mensagem do servidor:`, error);
        }
      });

      this.socket.on('close', () => {
        console.log(`Conexão WebSocket fechada para ${this.connectionInfo.name}`);
        this.status = 'disconnected';
        this.stopPingInterval();
        
        // Tentar reconectar automaticamente
        this.reconnect();
      });

      this.socket.on('error', (error) => {
        console.error(`Erro na conexão WebSocket para ${this.connectionInfo.name}:`, error);
        // Erros serão seguidos por um evento 'close', então lidamos com a reconexão lá
      });
    } catch (error) {
      console.error(`Erro ao conectar ao servidor WhatsApp:`, error);
      this.status = 'disconnected';
      this.emit('connectionError', error);
    }
  }

  /**
   * Tenta reconectar automaticamente
   */
  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`Número máximo de tentativas de reconexão atingido para ${this.connectionInfo.name}`);
      this.emit('reconnectFailed');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Backoff exponencial, max 30s

    console.log(`Tentando reconectar em ${delay/1000}s... (tentativa ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Inicia intervalo de ping para manter a conexão viva
   */
  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.sendToServer({ action: 'ping' });
      }
    }, 30000); // Ping a cada 30 segundos
  }

  /**
   * Para o intervalo de ping
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Envia dados para o servidor
   */
  private sendToServer(data: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else {
      console.warn(`Tentativa de envio para servidor com socket não conectado`);
    }
  }

  /**
   * Processa mensagens recebidas do servidor
   */
  private handleServerMessage(message: any): void {
    switch (message.type) {
      case 'qr':
        this.qrCode = message.qrCode;
        this.emit('qrCode', message.qrCode);
        break;
      
      case 'status':
        const oldStatus = this.status;
        this.status = message.status;
        
        if (oldStatus !== this.status) {
          if (this.status === 'connected') {
            this.emit('connected');
            this.processQueue();
          } else if (this.status === 'disconnected') {
            this.emit('disconnected');
          }
        }
        break;
      
      case 'message_status':
        this.emit('messageStatus', {
          id: message.id,
          to: message.to,
          status: message.status,
          timestamp: message.timestamp,
          error: message.error
        });
        break;
      
      case 'message_received':
        this.emit('messageReceived', {
          from: message.from,
          content: message.content,
          timestamp: message.timestamp,
          type: message.mediaType || 'text',
          mediaUrl: message.mediaUrl
        });
        break;
        
      default:
        console.log(`Mensagem não reconhecida do servidor:`, message);
    }
  }

  /**
   * Envia uma mensagem pelo WhatsApp
   */
  public async sendMessage(message: WhatsappMessage): Promise<string> {
    // Gerar um ID único para a mensagem
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (this.status !== 'connected') {
      // Adicionar à fila se não estiver conectado
      this.messageQueue.push(message);
      return messageId;
    }

    try {
      this.sendToServer({
        action: 'send_message',
        id: messageId,
        ...message
      });
      
      return messageId;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      throw error;
    }
  }

  /**
   * Processa a fila de mensagens
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.status !== 'connected' || this.messageQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    try {
      while (this.messageQueue.length > 0 && this.status === 'connected') {
        const message = this.messageQueue.shift();
        if (message) {
          await this.sendMessage(message);
          // Pequeno delay entre mensagens
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      console.error('Erro ao processar fila de mensagens:', error);
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Desconecta do servidor
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.stopPingInterval();
    this.status = 'disconnected';
  }

  /**
   * Retorna o QR Code atual
   */
  public getQrCode(): string {
    return this.qrCode;
  }

  /**
   * Retorna o status atual da conexão
   */
  public getStatus(): string {
    return this.status;
  }
}

/**
 * Classe principal para gerenciar o serviço WhatsApp
 */
export class WhatsappService {
  private connections: WhatsappConnectionMap = {};
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
    if (this.connections[connection.id]) {
      return this.connections[connection.id];
    }

    const handler = new WhatsappSessionHandler(connection);
    this.connections[connection.id] = handler;
    
    // Configurar ouvintes de eventos
    handler.on('connected', () => {
      console.log(`WhatsApp conectado: ${connection.name}`);
      // Aqui você atualizaria o status no banco de dados
    });

    handler.on('disconnected', () => {
      console.log(`WhatsApp desconectado: ${connection.name}`);
      // Aqui você atualizaria o status no banco de dados
    });

    handler.on('qrCode', (qrCode: string) => {
      console.log(`Novo QR Code para: ${connection.name}`);
      // Aqui você atualizaria o QR Code no banco de dados
    });

    return handler;
  }

  /**
   * Obtém uma conexão pelo ID
   */
  public getConnection(id: number): WhatsappSessionHandler | null {
    return this.connections[id] || null;
  }

  /**
   * Remove uma conexão
   */
  public removeConnection(id: number): void {
    const connection = this.connections[id];
    if (connection) {
      connection.disconnect();
      delete this.connections[id];
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
    const connection = this.getConnection(connectionId);
    
    if (!connection) {
      console.error(`Conexão ${connectionId} não encontrada`);
      return null;
    }

    // Formatar número de telefone se necessário
    const formattedPhone = this.formatPhoneNumber(to);
    
    return connection.sendMessage({
      type: 'text',
      to: formattedPhone,
      content
    });
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
    const connection = this.getConnection(connectionId);
    
    if (!connection) {
      console.error(`Conexão ${connectionId} não encontrada`);
      return null;
    }

    const formattedPhone = this.formatPhoneNumber(to);
    
    return connection.sendMessage({
      type: 'image',
      to: formattedPhone,
      content: '',
      mediaUrl,
      caption
    });
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
    const connection = this.getConnection(connectionId);
    
    if (!connection) {
      console.error(`Conexão ${connectionId} não encontrada`);
      return null;
    }

    const formattedPhone = this.formatPhoneNumber(to);
    
    return connection.sendMessage({
      type: 'document',
      to: formattedPhone,
      content: '',
      mediaUrl,
      filename
    });
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
      console.error(`Conexão ${connectionId} não encontrada`);
      return;
    }

    console.log(`Iniciando campanha: ${campaign.name} para ${contacts.length} contatos`);

    // Enviar mensagens com intervalo para evitar bloqueio
    for (const contact of contacts) {
      try {
        // Processar template
        const processedContent = this.processTemplate(template.content, {
          nome: contact.name,
          telefone: contact.phoneNumber,
          // Adicione mais campos conforme necessário
        });

        // Calcular intervalo aleatório entre min e max
        const minInterval = campaign.minInterval || 1;
        const maxInterval = campaign.maxInterval || 3;
        const interval = Math.floor(
          Math.random() * 
          (maxInterval - minInterval) + 
          minInterval
        ) * 1000; // converter para ms

        // Esperar o intervalo
        await new Promise(resolve => setTimeout(resolve, interval));

        // Enviar mensagem com base no tipo
        if (template.hasMedia) {
          if (template.mediaType === 'image') {
            await this.sendImageMessage(
              connectionId,
              contact.phoneNumber,
              template.mediaUrl!,
              processedContent
            );
          } else if (template.mediaType === 'document') {
            await this.sendDocumentMessage(
              connectionId,
              contact.phoneNumber,
              template.mediaUrl!,
              'documento.pdf' // Nome do arquivo
            );
          }
        } else {
          await this.sendTextMessage(
            connectionId,
            contact.phoneNumber,
            processedContent
          );
        }

        console.log(`Mensagem enviada para ${contact.name} (${contact.phoneNumber})`);
        
      } catch (error) {
        console.error(`Erro ao enviar mensagem para ${contact.phoneNumber}:`, error);
        // Continuar com o próximo contato
      }
    }

    console.log(`Campanha ${campaign.name} finalizada`);
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
}

// Exportar a instância do serviço
export const whatsappService = WhatsappService.getInstance();