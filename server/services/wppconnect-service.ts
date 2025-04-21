import { create, Whatsapp, CreateOptions, Message } from '@wppconnect-team/wppconnect';
import { EventEmitter } from 'events';
import { resolve } from 'path';
import { 
  WhatsappConnection,
  WhatsappContact,
  WhatsappTemplate,
  WhatsappCampaign,
  WhatsappGroup
} from '@shared/schema';

// O tipo InternalWhatsappMessage é importado quando este arquivo é importado pelo adaptador WhatsApp
interface InternalInternalWhatsappMessage {
  type: 'text' | 'image' | 'video' | 'document' | 'audio';
  to: string;
  content: string;
  mediaUrl?: string;
  caption?: string;
  filename?: string;
}

// Status interno de uma mensagem enviada
type InternalMessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

// Interface interna para o evento de status de mensagem
interface InternalMessageStatusEvent {
  id: string;
  to: string;
  status: InternalMessageStatus;
  timestamp: number;
  error?: string;
}

// Mapeamento de conexões WhatsApp
interface WhatsappConnectionMap {
  [id: number]: WhatsappSessionHandler;
}

/**
 * Classe para gerenciar uma conexão específica do WhatsApp usando WPPConnect
 */
export class WhatsappSessionHandler extends EventEmitter {
  private qrCode: string = '';
  private status: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private connectionInfo: WhatsappConnection;
  private messageQueue: InternalWhatsappMessage[] = [];
  private processingQueue: boolean = false;
  private client: Whatsapp | null = null;
  private sessionPath: string = './whatsapp-sessions';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor(connectionInfo: WhatsappConnection) {
    super();
    this.connectionInfo = connectionInfo;
  }

  /**
   * Conecta ao WhatsApp usando WPPConnect
   */
  public async connect(): Promise<void> {
    if (this.client && this.status === 'connected') {
      console.log(`Já existe uma conexão em andamento para ${this.connectionInfo.name}`);
      return;
    }

    this.status = 'connecting';
    console.log(`Iniciando conexão WhatsApp para ${this.connectionInfo.name}...`);

    try {
      // Opções para a criação da sessão WhatsApp
      const wppOptions: CreateOptions = {
        session: `session-${this.connectionInfo.id}`, // Nome único para a sessão
        catchQR: (qrCode, asciiQR, attempt) => {
          console.log(`QR Code gerado para ${this.connectionInfo.name} (tentativa ${attempt})`);
          this.qrCode = qrCode;
          this.emit('qrCode', this.qrCode);
        },
        statusFind: (statusSession, session) => {
          console.log(`Status da sessão ${session}: ${statusSession}`);
        },
        headless: true, // Navegador em modo headless
        devtools: false,
        useChrome: false,
        debug: false,
        logQR: false,
        browserWS: '',
        browserArgs: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ],
        folderNameToken: this.sessionPath, // Pasta para salvar os tokens
        updatesLog: false, // Não logar as atualizações
        autoClose: 60000, // Fechar após 60 segundos sem atividade
        puppeteerOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
          ]
        }
      };

      // Criar a sessão WhatsApp
      this.client = await create(wppOptions);

      // Configurar os eventos
      this.setupEvents();

      // Atualizar o status da conexão
      this.status = 'connected';
      this.emit('connected');

      console.log(`Conexão WhatsApp estabelecida com sucesso para ${this.connectionInfo.name}`);

      // Processar mensagens em fila, se houver
      if (this.messageQueue.length > 0) {
        this.processQueue();
      }

      this.reconnectAttempts = 0;
    } catch (error) {
      console.error(`Erro ao conectar ao WhatsApp para ${this.connectionInfo.name}:`, error);
      this.status = 'disconnected';
      this.attemptReconnect();
    }
  }

  /**
   * Configura os eventos do cliente WhatsApp
   */
  private setupEvents(): void {
    if (!this.client) return;

    // Evento de mensagem recebida
    this.client.onMessage((message) => {
      console.log(`Mensagem recebida para ${this.connectionInfo.name}:`, message.body);
      this.emit('messageReceived', {
        from: message.from,
        content: message.body,
        timestamp: new Date(message.timestamp * 1000).getTime(),
        type: message.type,
        mediaUrl: (message as any).mediaUrl || ''
      });
    });

    // Evento de desconexão
    this.client.onStateChange((state) => {
      console.log(`Estado alterado para ${state}`);
      if (state === 'CONFLICT' || state === 'UNLAUNCHED' || state === 'UNPAIRED') {
        this.status = 'disconnected';
        this.emit('disconnected');
        this.attemptReconnect();
      } else if (state === 'CONNECTED') {
        this.status = 'connected';
        this.emit('connected');
      }
    });

    // Evento de status de mensagem
    this.client.onAck((ack) => {
      const statusEvent: InternalMessageStatusEvent = {
        id: ack.id?._serialized || `ack_${Date.now()}`,
        to: ack.to || '',
        status: this.mapAckToStatus(ack.ack),
        timestamp: Date.now()
      };
      
      this.emit('messageStatus', statusEvent);
    });
  }

  /**
   * Mapeia os valores de ACK do WhatsApp para status de mensagem
   */
  private mapAckToStatus(ack: number): InternalMessageStatus {
    switch (ack) {
      case -1: return 'failed';     // Erro
      case 0: return 'pending';     // Pendente
      case 1: return 'sent';        // Enviado para o servidor
      case 2: return 'delivered';   // Entregue ao destinatário
      case 3: return 'read';        // Lido pelo destinatário
      default: return 'pending';
    }
  }

  /**
   * Desconecta do WhatsApp
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
      }
      
      this.status = 'disconnected';
      console.log(`Desconectado do WhatsApp para ${this.connectionInfo.name}`);
      this.emit('disconnected');
    } catch (error) {
      console.error(`Erro ao desconectar do WhatsApp para ${this.connectionInfo.name}:`, error);
    }
  }

  /**
   * Envia mensagem para o número especificado
   */
  public async sendMessage(message: InternalWhatsappMessage): Promise<string> {
    if (this.status !== 'connected' || !this.client) {
      // Adicionar à fila para enviar quando conectar
      this.messageQueue.push(message);
      return `queued_${Date.now()}`;
    }
    
    try {
      // Formatar o número de telefone
      const formattedNumber = this.formatPhoneNumber(message.to);
      let result: any; // A tipagem vai depender da biblioteca, então usamos any
      
      switch (message.type) {
        case 'text':
          result = await this.client.sendText(formattedNumber, message.content);
          break;
          
        case 'image':
          if (!message.mediaUrl) throw new Error('URL da imagem não fornecida');
          result = await this.client.sendImage(
            formattedNumber,
            message.mediaUrl,
            message.filename || 'image',
            message.caption || ''
          );
          break;
          
        case 'video':
          if (!message.mediaUrl) throw new Error('URL do vídeo não fornecida');
          result = await this.client.sendFile(
            formattedNumber,
            message.mediaUrl,
            message.filename || 'video',
            message.caption || ''
          );
          break;
          
        case 'document':
          if (!message.mediaUrl) throw new Error('URL do documento não fornecida');
          result = await this.client.sendFile(
            formattedNumber,
            message.mediaUrl,
            message.filename || 'document',
            message.caption || ''
          );
          break;
          
        case 'audio':
          if (!message.mediaUrl) throw new Error('URL do áudio não fornecida');
          result = await this.client.sendPtt(
            formattedNumber,
            message.mediaUrl,
            message.filename || 'audio'
          );
          break;
          
        default:
          throw new Error(`Tipo de mensagem não suportado: ${message.type}`);
      }
      
      // O tipo de retorno pode variar dependendo da função do WPPConnect
      // Aqui estamos tratando genericamente, garantindo que temos um ID de retorno
      if (typeof result === 'object' && result !== null) {
        if (result.id && typeof result.id === 'object' && result.id._serialized) {
          return result.id._serialized;
        } else if (result.id && typeof result.id === 'string') {
          return result.id;
        }
      }
      
      // Se não conseguiu extrair um ID, retorna um ID gerado
      return `msg_${Date.now()}`;
    } catch (error) {
      console.error(`Erro ao enviar mensagem para ${message.to}:`, error);
      
      // Adicionar à fila para tentar novamente
      this.messageQueue.push(message);
      
      throw error;
    }
  }

  /**
   * Retorna o código QR para escanear no WhatsApp
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

  /**
   * Processa a fila de mensagens
   */
  private async processQueue(): Promise<void> {
    if (this.messageQueue.length === 0 || this.status !== 'connected' || !this.client) {
      this.processingQueue = false;
      return;
    }
    
    this.processingQueue = true;
    
    try {
      while (this.messageQueue.length > 0 && this.status === 'connected') {
        const message = this.messageQueue.shift();
        if (message) {
          await this.sendMessage(message);
          // Aguardar um breve momento antes de processar a próxima mensagem
          // para evitar limitações de taxa
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      console.error('Erro ao processar mensagem da fila:', error);
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Formata um número de telefone para o padrão WhatsApp
   */
  private formatPhoneNumber(phone: string): string {
    // Remover caracteres não numéricos
    let cleaned = phone.replace(/\D/g, '');
    
    // Garantir que começa com o código do país (Brasil = 55)
    if (!cleaned.startsWith('55')) {
      cleaned = '55' + cleaned;
    }
    
    // Adicionar o sufixo @c.us que o WPPConnect requer
    return `${cleaned}@c.us`;
  }

  /**
   * Tenta reconectar ao WhatsApp após um erro
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`Número máximo de tentativas de reconexão excedido para ${this.connectionInfo.name}`);
      return;
    }
    
    this.reconnectAttempts++;
    console.log(`Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts} para ${this.connectionInfo.name}`);
    
    // Tempo de espera exponencial entre tentativas
    const delay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts));
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }
  
  /**
   * Lista contatos do WhatsApp
   */
  public async getContacts(): Promise<any[]> {
    if (!this.client || this.status !== 'connected') {
      throw new Error('Cliente WhatsApp não está conectado');
    }
    
    try {
      return await this.client.getAllContacts();
    } catch (error) {
      console.error('Erro ao obter contatos do WhatsApp:', error);
      throw error;
    }
  }
  
  /**
   * Verifica se um número está cadastrado no WhatsApp
   */
  public async checkNumberStatus(phoneNumber: string): Promise<boolean> {
    if (!this.client || this.status !== 'connected') {
      throw new Error('Cliente WhatsApp não está conectado');
    }
    
    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const result = await this.client.checkNumberStatus(formattedNumber);
      return result.numberExists;
    } catch (error) {
      console.error(`Erro ao verificar status do número ${phoneNumber}:`, error);
      return false;
    }
  }
  
  /**
   * Cria um grupo no WhatsApp
   */
  public async createGroup(name: string, participants: string[]): Promise<any> {
    if (!this.client || this.status !== 'connected') {
      throw new Error('Cliente WhatsApp não está conectado');
    }
    
    if (!name || !participants || participants.length === 0) {
      throw new Error('Nome do grupo e participantes são obrigatórios');
    }
    
    try {
      // Formatar os números dos participantes
      const formattedParticipants = participants.map(p => this.formatPhoneNumber(p));
      return await this.client.createGroup(name, formattedParticipants);
    } catch (error) {
      console.error(`Erro ao criar grupo ${name}:`, error);
      throw error;
    }
  }
}

/**
 * Classe principal para gerenciar as sessões do WhatsApp
 */
export class WPPConnectService {
  private connections: WhatsappConnectionMap = {};
  private static instance: WPPConnectService;

  private constructor() {}

  /**
   * Retorna a instância única do serviço (Singleton)
   */
  public static getInstance(): WPPConnectService {
    if (!WPPConnectService.instance) {
      WPPConnectService.instance = new WPPConnectService();
    }
    return WPPConnectService.instance;
  }

  /**
   * Registra uma nova conexão do WhatsApp
   */
  public registerConnection(connectionInfo: WhatsappConnection): WhatsappSessionHandler {
    if (this.connections[connectionInfo.id]) {
      return this.connections[connectionInfo.id];
    }
    
    const handler = new WhatsappSessionHandler(connectionInfo);
    this.connections[connectionInfo.id] = handler;
    
    // Configurar ouvintes de eventos
    handler.on('connected', () => {
      console.log(`WhatsApp conectado: ${connectionInfo.name}`);
      // Aqui você atualizaria o status no banco de dados
    });

    handler.on('disconnected', () => {
      console.log(`WhatsApp desconectado: ${connectionInfo.name}`);
      // Aqui você atualizaria o status no banco de dados
    });

    handler.on('qrCode', (qrCode: string) => {
      console.log(`Novo QR Code para: ${connectionInfo.name}`);
      // Aqui você atualizaria o QR Code no banco de dados
    });

    return handler;
  }

  /**
   * Obtém um handler de conexão pelo ID
   */
  public getConnection(id: number): WhatsappSessionHandler | undefined {
    return this.connections[id];
  }

  /**
   * Remove uma conexão pelo ID
   */
  public removeConnection(id: number): boolean {
    const handler = this.connections[id];
    
    if (handler) {
      handler.disconnect();
      delete this.connections[id];
      return true;
    }
    
    return false;
  }

  /**
   * Lista todas as conexões ativas
   */
  public getConnections(): WhatsappSessionHandler[] {
    return Object.values(this.connections);
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
    contacts: WhatsappContact[]
  ): Promise<void> {
    if (!campaign || !template || !contacts || contacts.length === 0) {
      throw new Error('Campanha, template e contatos são obrigatórios');
    }
    
    const connection = this.getConnection(campaign.connectionId);
    if (!connection) {
      throw new Error(`Conexão ${campaign.connectionId} não encontrada`);
    }
    
    console.log(`Iniciando campanha: ${campaign.name} para ${contacts.length} contatos`);
    
    for (const contact of contacts) {
      try {
        // Processar template
        const processedContent = this.processTemplate(template.content, {
          nome: contact.name,
          telefone: contact.phoneNumber,
          // Adicione mais campos conforme necessário
        });
        
        // Intervalo entre mensagens (randômico ou fixo)
        const interval = campaign.minInterval ? 
          (Math.random() * (campaign.maxInterval! - campaign.minInterval) + campaign.minInterval) * 1000 : 
          1000; // Padrão: 1 segundo
        
        // Aguardar o intervalo
        await new Promise(resolve => setTimeout(resolve, interval));
        
        // Enviar mensagem com base no tipo
        const message: InternalWhatsappMessage = {
          type: 'text',
          to: contact.phoneNumber,
          content: processedContent
        };
        
        // Se tiver mídia, configurar os parâmetros da mídia
        if (template.hasMedia && template.mediaUrl) {
          message.type = template.mediaType as any || 'image';
          message.mediaUrl = template.mediaUrl as string;
          
          if (message.type === 'text') {
            message.type = 'image'; // Fallback para imagem se o tipo não for especificado
          }
          
          if (message.type !== 'audio') {
            message.caption = processedContent;
          }
        }
        
        // Enviar a mensagem
        await connection.sendMessage(message);
        console.log(`Mensagem enviada para ${contact.name} (${contact.phoneNumber})`);
      
      } catch (error) {
        console.error(`Erro ao enviar mensagem para ${contact.phoneNumber}:`, error);
        // Continuar com o próximo contato
      }
    }
    
    console.log(`Campanha ${campaign.name} finalizada`);
  }
}

// Exportar a instância única do serviço
export const wppConnectService = WPPConnectService.getInstance();