import fetch from 'node-fetch';

/**
 * Interface para a resposta do QR Code
 */
interface QRCodeResponse {
  status: boolean;
  session: string;
  qrcode: string;
  urlcode?: string;
}

/**
 * Interface para a resposta do status da sessão
 */
interface SessionStatusResponse {
  status: boolean;
  session: string;
  result: 'CONNECTED' | 'DISCONNECTED' | 'QRCODE' | 'STARTING' | 'ERROR';
  statusMessage?: string;
}

/**
 * Interface para envio de mensagem
 */
interface SendMessageRequest {
  session: string;
  phone: string;
  message: string;
}

/**
 * Interface para envio de arquivo
 */
interface SendFileRequest {
  session: string;
  phone: string;
  path: string;   // URL do arquivo
  filename?: string;
  caption?: string;
}

/**
 * Classe para integração com o WPPConnect Server
 */
export class WPPConnectServerService {
  private baseUrl: string;
  private secretKey: string;
  
  constructor(baseUrl: string = 'http://localhost:21465', secretKey: string = 'aprove_key') {
    this.baseUrl = baseUrl;
    this.secretKey = secretKey;
  }
  
  /**
   * Cabeçalhos padrão para requisições
   */
  private get headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.secretKey}`
    };
  }
  
  /**
   * Inicia uma nova sessão no WPPConnect Server
   */
  public async startSession(session: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/${this.secretKey}/start-session`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          session,
          webhook: null,     // Não usaremos webhook por enquanto
          waitQrCode: true   // Esperar até gerar o QR code
        })
      });
      
      const data = await response.json();
      return data.status;
    } catch (error) {
      console.error('Erro ao iniciar sessão:', error);
      return false;
    }
  }
  
  /**
   * Obtém o QR Code da sessão
   */
  public async getQrCode(session: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/${this.secretKey}/qrcode?session=${session}`, {
        method: 'GET',
        headers: this.headers
      });
      
      const data = await response.json() as QRCodeResponse;
      
      if (data.status && data.qrcode) {
        return data.qrcode;
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao obter QR Code:', error);
      return null;
    }
  }
  
  /**
   * Obtém o status da sessão
   */
  public async getSessionStatus(session: string): Promise<'CONNECTED' | 'DISCONNECTED' | 'QRCODE' | 'STARTING' | 'ERROR'> {
    try {
      const response = await fetch(`${this.baseUrl}/api/${this.secretKey}/status-session?session=${session}`, {
        method: 'GET',
        headers: this.headers
      });
      
      const data = await response.json() as SessionStatusResponse;
      
      if (data.status) {
        return data.result;
      }
      
      return 'ERROR';
    } catch (error) {
      console.error('Erro ao obter status da sessão:', error);
      return 'ERROR';
    }
  }
  
  /**
   * Fecha uma sessão no WPPConnect Server
   */
  public async closeSession(session: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/${this.secretKey}/close-session`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ session })
      });
      
      const data = await response.json();
      return data.status;
    } catch (error) {
      console.error('Erro ao fechar sessão:', error);
      return false;
    }
  }
  
  /**
   * Envia uma mensagem de texto
   */
  public async sendMessage(session: string, phone: string, message: string): Promise<boolean> {
    try {
      // Remover qualquer caractere não numérico
      const cleanPhone = phone.replace(/\D/g, '');
      
      const response = await fetch(`${this.baseUrl}/api/${this.secretKey}/send-message`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          session,
          phone: cleanPhone,
          message
        } as SendMessageRequest)
      });
      
      const data = await response.json();
      return data.status;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      return false;
    }
  }
  
  /**
   * Envia um arquivo (imagem, documento, vídeo, áudio)
   */
  public async sendFile(session: string, phone: string, path: string, filename?: string, caption?: string): Promise<boolean> {
    try {
      // Remover qualquer caractere não numérico
      const cleanPhone = phone.replace(/\D/g, '');
      
      const response = await fetch(`${this.baseUrl}/api/${this.secretKey}/send-file`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          session,
          phone: cleanPhone,
          path,
          filename,
          caption
        } as SendFileRequest)
      });
      
      const data = await response.json();
      return data.status;
    } catch (error) {
      console.error('Erro ao enviar arquivo:', error);
      return false;
    }
  }
  
  /**
   * Obtém todos os contatos
   */
  public async getAllContacts(session: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/${this.secretKey}/all-contacts?session=${session}`, {
        method: 'GET',
        headers: this.headers
      });
      
      const data = await response.json();
      
      if (data.status && Array.isArray(data.response)) {
        return data.response;
      }
      
      return [];
    } catch (error) {
      console.error('Erro ao obter contatos:', error);
      return [];
    }
  }
  
  /**
   * Verifica se o número está no WhatsApp
   */
  public async checkNumberStatus(session: string, phone: string): Promise<boolean> {
    try {
      // Remover qualquer caractere não numérico
      const cleanPhone = phone.replace(/\D/g, '');
      
      const response = await fetch(`${this.baseUrl}/api/${this.secretKey}/check-number-status?session=${session}&phone=${cleanPhone}`, {
        method: 'GET',
        headers: this.headers
      });
      
      const data = await response.json();
      
      if (data.status && data.response && data.response.numberExists) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao verificar status do número:', error);
      return false;
    }
  }
}

// Exportar instância única do serviço
export const wppConnectServerService = new WPPConnectServerService();