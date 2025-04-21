/**
 * Serviço que integra diferentes abordagens de conexão com WhatsApp
 * Permite alternar entre conexão direta WPPConnect e servidor WPPConnect REST API
 */
import { EventEmitter } from 'events';
import { WhatsappMessage } from './whatsapp';
import { WhatsappConnection } from '@shared/schema';
import { WhatsappSessionHandler, WPPConnectService } from './wppconnect-service';
import { WPPConnectApiClient, wppconnectApiClient } from './wppconnect-api-client';

// Modo de conexão
export type ConnectionMode = 'direct' | 'server' | 'auto';

/**
 * Classe que integra diferentes abordagens de conexão com WhatsApp
 */
export class WPPConnectIntegration extends EventEmitter {
  private connectionInfo: WhatsappConnection;
  private mode: ConnectionMode = 'auto';
  private directHandler: WhatsappSessionHandler | null = null;
  private directService = WPPConnectService.getInstance();
  private serverClient = wppconnectApiClient;
  private sessionName: string;
  private status: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private qrCode: string = '';
  private lastMode: 'direct' | 'server' | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  
  constructor(connectionInfo: WhatsappConnection, mode: ConnectionMode = 'auto') {
    super();
    this.connectionInfo = connectionInfo;
    this.mode = mode;
    this.sessionName = `session-${connectionInfo.id}`;
  }
  
  /**
   * Inicia a conexão com WhatsApp
   */
  public async connect(): Promise<void> {
    if (this.status === 'connected') {
      console.log(`Já existe uma conexão em andamento para ${this.connectionInfo.name}`);
      return;
    }
    
    this.status = 'connecting';
    console.log(`Iniciando conexão WhatsApp para ${this.connectionInfo.name} no modo: ${this.mode}`);
    
    if (this.mode === 'direct') {
      await this.connectDirect();
    } else if (this.mode === 'server') {
      await this.connectServer();
    } else {
      // Modo automático: tenta primeiro o servidor, depois a conexão direta
      try {
        await this.connectServer();
        this.lastMode = 'server';
      } catch (error) {
        console.log(`Erro na conexão via servidor, tentando conexão direta: ${error}`);
        try {
          await this.connectDirect();
          this.lastMode = 'direct';
        } catch (directError) {
          console.error(`Erro em ambos os métodos de conexão: ${directError}`);
          this.status = 'disconnected';
          throw directError;
        }
      }
    }
  }
  
  /**
   * Conecta via WPPConnect direto
   */
  private async connectDirect(): Promise<void> {
    try {
      this.directHandler = this.directService.registerConnection(this.connectionInfo);
      
      // Configurar eventos
      this.directHandler.on('qrCode', (qrCode: string) => {
        this.qrCode = qrCode;
        this.emit('qrCode', qrCode);
      });
      
      this.directHandler.on('connected', () => {
        this.status = 'connected';
        this.emit('connected');
      });
      
      this.directHandler.on('disconnected', () => {
        this.status = 'disconnected';
        this.emit('disconnected');
        this.tryReconnect();
      });
      
      await this.directHandler.connect();
      this.lastMode = 'direct';
    } catch (error) {
      console.error(`Erro na conexão direta para ${this.connectionInfo.name}:`, error);
      this.status = 'disconnected';
      throw error;
    }
  }
  
  /**
   * Conecta via servidor WPPConnect REST API
   */
  private async connectServer(): Promise<void> {
    try {
      // Iniciar sessão no servidor
      const started = await this.serverClient.startSession(this.sessionName);
      
      if (!started) {
        throw new Error('Não foi possível iniciar a sessão no servidor');
      }
      
      // Verificar status inicial
      let serverStatus = await this.serverClient.getSessionStatus(this.sessionName);
      
      if (serverStatus === 'CONNECTED') {
        this.status = 'connected';
        this.emit('connected');
        this.lastMode = 'server';
        return;
      }
      
      // Se não estiver conectado, obter QR Code
      this.qrCode = await this.serverClient.getQrCode(this.sessionName) || '';
      
      if (this.qrCode) {
        this.emit('qrCode', this.qrCode);
      }
      
      // Verificar status a cada 5 segundos até conectar ou falhar
      const maxAttempts = 12; // 1 minuto (12 * 5 segundos)
      let attempts = 0;
      
      const checkConnection = () => {
        return new Promise<void>((resolve, reject) => {
          const interval = setInterval(async () => {
            attempts++;
            try {
              serverStatus = await this.serverClient.getSessionStatus(this.sessionName);
              
              if (serverStatus === 'CONNECTED') {
                clearInterval(interval);
                this.status = 'connected';
                this.emit('connected');
                this.lastMode = 'server';
                resolve();
              } else if (attempts >= maxAttempts) {
                clearInterval(interval);
                reject(new Error(`Timeout ao conectar ao servidor após ${maxAttempts} tentativas`));
              }
            } catch (error) {
              clearInterval(interval);
              reject(error);
            }
          }, 5000);
        });
      };
      
      await checkConnection();
    } catch (error) {
      console.error(`Erro na conexão via servidor para ${this.connectionInfo.name}:`, error);
      this.status = 'disconnected';
      throw error;
    }
  }
  
  /**
   * Envia uma mensagem WhatsApp
   */
  public async sendMessage(message: WhatsappMessage): Promise<string | null> {
    if (this.status !== 'connected') {
      throw new Error('WhatsApp não está conectado');
    }
    
    // Verificar limite diário de mensagens
    if (this.connectionInfo.dailyLimit && this.connectionInfo.messagesSent !== undefined) {
      // Verificar se precisa resetar o contador diário
      const now = new Date();
      const lastReset = this.connectionInfo.lastResetDate ? new Date(this.connectionInfo.lastResetDate) : null;
      
      if (lastReset) {
        const isSameDay = 
          now.getDate() === lastReset.getDate() && 
          now.getMonth() === lastReset.getMonth() && 
          now.getFullYear() === lastReset.getFullYear();
        
        if (!isSameDay) {
          // Resetar contador se for um novo dia
          this.emit('resetMessageCounter');
        } else if (this.connectionInfo.messagesSent >= this.connectionInfo.dailyLimit) {
          throw new Error(`Limite diário de ${this.connectionInfo.dailyLimit} mensagens atingido`);
        }
      }
      
      // Incrementar contador
      this.emit('incrementMessageCounter');
    }
    
    try {
      if (this.lastMode === 'direct' && this.directHandler) {
        return await this.directHandler.sendMessage(message);
      } else if (this.lastMode === 'server') {
        return await this.serverClient.sendWhatsappMessage(this.sessionName, message);
      } else {
        throw new Error('Método de conexão não inicializado');
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      return null;
    }
  }
  
  /**
   * Verifica se um número existe no WhatsApp
   */
  public async checkNumberStatus(phoneNumber: string): Promise<boolean> {
    try {
      if (this.lastMode === 'direct' && this.directHandler) {
        return await this.directHandler.checkNumberStatus(phoneNumber);
      } else if (this.lastMode === 'server') {
        return await this.serverClient.checkNumberStatus(this.sessionName, phoneNumber);
      } else {
        throw new Error('Método de conexão não inicializado');
      }
    } catch (error) {
      console.error(`Erro ao verificar status do número ${phoneNumber}:`, error);
      return false;
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
   * Desconecta do WhatsApp
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      
      if (this.lastMode === 'direct' && this.directHandler) {
        await this.directHandler.disconnect();
      } else if (this.lastMode === 'server') {
        await this.serverClient.logout(this.sessionName);
      }
      
      this.status = 'disconnected';
      this.emit('disconnected');
    } catch (error) {
      console.error(`Erro ao desconectar do WhatsApp para ${this.connectionInfo.name}:`, error);
    }
  }
  
  /**
   * Tenta reconectar ao WhatsApp após um erro
   */
  private tryReconnect(): void {
    // Cancelar qualquer timer existente
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    // Tentar reconectar em 10 segundos
    this.reconnectTimer = setTimeout(() => {
      console.log(`Tentando reconectar ${this.connectionInfo.name}...`);
      this.connect().catch(error => {
        console.error(`Erro na reconexão automática: ${error}`);
      });
    }, 10000);
  }
}

/**
 * Factory para WPPConnectIntegration
 */
export class WPPConnectIntegrationFactory {
  private static instances: Map<number, WPPConnectIntegration> = new Map();
  
  /**
   * Obtém uma instância de WPPConnectIntegration para a conexão especificada
   */
  public static getInstance(connectionInfo: WhatsappConnection, mode: ConnectionMode = 'auto'): WPPConnectIntegration {
    if (!this.instances.has(connectionInfo.id)) {
      const instance = new WPPConnectIntegration(connectionInfo, mode);
      this.instances.set(connectionInfo.id, instance);
    }
    
    return this.instances.get(connectionInfo.id)!;
  }
  
  /**
   * Remove uma instância pelo ID da conexão
   */
  public static removeInstance(connectionId: number): boolean {
    const instance = this.instances.get(connectionId);
    
    if (instance) {
      instance.disconnect();
      this.instances.delete(connectionId);
      return true;
    }
    
    return false;
  }
}