/**
 * Cliente HTTP para comunicação com o servidor WPPConnect
 */
import fetch from 'node-fetch';
import { WhatsappMessage } from './whatsapp';
import { resolve } from 'path';

interface WPPConnectApiResponse<T> {
  status: boolean;
  message?: string;
  error?: string;
  qrcode?: string;
  result?: any;
  response?: T;
}

/**
 * Cliente HTTP para comunicação com o servidor WPPConnect local
 */
export class WPPConnectApiClient {
  private baseUrl: string;
  private apiKey: string;
  
  constructor(baseUrl: string = 'http://localhost:21465', apiKey: string = 'seu-token') {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Inicia uma sessão no servidor WPPConnect
   */
  public async startSession(session: string): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/api/${this.apiKey}/start-session`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session })
      });

      const data = await response.json() as WPPConnectApiResponse<any>;
      return data.status;
    } catch (error) {
      console.error('Erro ao iniciar sessão:', error);
      return false;
    }
  }

  /**
   * Obtém o QR Code para uma sessão
   */
  public async getQrCode(session: string): Promise<string | null> {
    try {
      const url = `${this.baseUrl}/api/${this.apiKey}/qrcode?session=${session}`;
      const response = await fetch(url);
      const data = await response.json() as WPPConnectApiResponse<any>;
      
      if (!data.status || !data.qrcode) {
        return null;
      }
      
      return data.qrcode;
    } catch (error) {
      console.error('Erro ao obter QR Code:', error);
      return null;
    }
  }

  /**
   * Verifica o status de uma sessão
   */
  public async getSessionStatus(session: string): Promise<string> {
    try {
      const url = `${this.baseUrl}/api/${this.apiKey}/session-status?session=${session}`;
      const response = await fetch(url);
      const data = await response.json() as WPPConnectApiResponse<{ result: string }>;
      
      if (!data.status) {
        return 'DISCONNECTED';
      }
      
      return data.result || 'DISCONNECTED';
    } catch (error) {
      console.error('Erro ao verificar status da sessão:', error);
      return 'DISCONNECTED';
    }
  }

  /**
   * Verifica se um número existe no WhatsApp
   */
  public async checkNumberStatus(session: string, phone: string): Promise<boolean> {
    try {
      // Limpar o número de telefone (remover caracteres não numéricos)
      const cleanPhone = phone.replace(/\D/g, '');
      
      const url = `${this.baseUrl}/api/${this.apiKey}/check-number-status?session=${session}&phone=${cleanPhone}`;
      const response = await fetch(url);
      const data = await response.json() as WPPConnectApiResponse<{ numberExists: boolean }>;
      
      if (!data.status || !data.response) {
        return false;
      }
      
      return data.response.numberExists || false;
    } catch (error) {
      console.error('Erro ao verificar status do número:', error);
      return false;
    }
  }

  /**
   * Envia uma mensagem de texto
   */
  public async sendMessage(session: string, phone: string, message: string): Promise<string | null> {
    try {
      const url = `${this.baseUrl}/api/${this.apiKey}/send-message`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session,
          phone,
          message
        })
      });

      const data = await response.json() as WPPConnectApiResponse<any>;
      
      if (!data.status) {
        console.error('Erro ao enviar mensagem:', data.message || 'Erro desconhecido');
        return null;
      }
      
      return data.result?.id?.id || data.result?.id?._serialized || `msg_${Date.now()}`;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      return null;
    }
  }

  /**
   * Envia um arquivo
   */
  public async sendFile(session: string, phone: string, path: string, filename?: string, caption?: string): Promise<string | null> {
    try {
      const url = `${this.baseUrl}/api/${this.apiKey}/send-file`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session,
          phone,
          path,
          filename,
          caption
        })
      });

      const data = await response.json() as WPPConnectApiResponse<any>;
      
      if (!data.status) {
        console.error('Erro ao enviar arquivo:', data.message || 'Erro desconhecido');
        return null;
      }
      
      return data.result?.id?.id || data.result?.id?._serialized || `file_${Date.now()}`;
    } catch (error) {
      console.error('Erro ao enviar arquivo:', error);
      return null;
    }
  }

  /**
   * Obtém todos os contatos
   */
  public async getAllContacts(session: string): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/api/${this.apiKey}/all-contacts?session=${session}`;
      const response = await fetch(url);
      const data = await response.json() as WPPConnectApiResponse<any[]>;
      
      if (!data.status || !data.response) {
        return [];
      }
      
      return data.response || [];
    } catch (error) {
      console.error('Erro ao obter contatos:', error);
      return [];
    }
  }

  /**
   * Logoff de uma sessão
   */
  public async logout(session: string): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/api/${this.apiKey}/logout-session`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session })
      });

      const data = await response.json() as WPPConnectApiResponse<any>;
      return data.status;
    } catch (error) {
      console.error('Erro ao fazer logout da sessão:', error);
      return false;
    }
  }

  /**
   * Envia uma mensagem mais complexa usando a interface WhatsappMessage
   */
  public async sendWhatsappMessage(session: string, message: WhatsappMessage): Promise<string | null> {
    try {
      if (message.type === 'text') {
        return await this.sendMessage(session, message.to, message.content);
      } else if (message.type === 'document' || message.type === 'image' || message.type === 'video' || message.type === 'audio') {
        if (!message.mediaUrl) {
          throw new Error('URL da mídia não fornecida');
        }
        
        return await this.sendFile(
          session,
          message.to,
          message.mediaUrl,
          message.filename,
          message.caption || message.content
        );
      } else {
        throw new Error(`Tipo de mensagem não suportado: ${message.type}`);
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem WhatsApp:', error);
      return null;
    }
  }
}

// Exportar instância singleton
export const wppconnectApiClient = new WPPConnectApiClient();