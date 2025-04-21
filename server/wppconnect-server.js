/**
 * Servidor WPPConnect para gerenciar conexões WhatsApp
 */
const express = require('express');
const cors = require('cors');
const wppconnect = require('@wppconnect-team/wppconnect');
const fs = require('fs');
const path = require('path');

// Configuração do servidor
const app = express();
const PORT = 21465;
const API_KEY = 'aprove_key'; // Chave de API para autenticação
const SESSIONS_DIR = path.join(__dirname, '..', 'whatsapp-sessions');

// Certificar que a pasta de sessões existe
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// Middlewares
app.use(cors());
app.use(express.json());

// Autenticação de API simples
app.use((req, res, next) => {
  const apiKey = req.path.split('/')[2]; // Formato: /api/{chave}/...
  if (apiKey !== API_KEY) {
    return res.status(403).json({ status: false, message: 'API Key inválida' });
  }
  next();
});

// Armazenar clientes ativos
const clients = {};

// Opções do WPPConnect
const wppOptions = {
  folderNameToken: SESSIONS_DIR, // Pasta onde serão guardadas as sessões
  puppeteerOptions: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ],
    headless: 'new'
  },
  createPathFileToken: true, // Cria arquivos de token para sessão
  tokenStore: 'file', // Armazena tokens em arquivo
  catchQR: (base64Qr, asciiQR, sessionName) => {
    // Armazenar QR code para ser recuperado mais tarde
    if (!clients[sessionName]) {
      clients[sessionName] = {};
    }
    clients[sessionName].qrCode = base64Qr;
  },
};

// Iniciar uma sessão
app.post('/api/:key/start-session', async (req, res) => {
  try {
    const { session } = req.body;
    
    if (!session) {
      return res.status(400).json({
        status: false,
        message: 'Nome da sessão é obrigatório'
      });
    }
    
    if (clients[session]?.client) {
      return res.status(200).json({
        status: true,
        message: 'Sessão já está inicializada'
      });
    }
    
    // Iniciar cliente
    const client = await wppconnect.create({
      session,
      ...wppOptions,
      statusFind: (statusSession, session) => {
        console.log(`Status da sessão [${session}]: ${statusSession}`);
        if (!clients[session]) {
          clients[session] = {};
        }
        clients[session].status = statusSession;
      }
    });
    
    if (!clients[session]) {
      clients[session] = {};
    }
    
    clients[session].client = client;
    clients[session].status = 'CONNECTED';
    
    res.status(200).json({
      status: true,
      message: 'Sessão iniciada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao iniciar sessão:', error);
    res.status(500).json({
      status: false,
      message: 'Erro ao iniciar sessão',
      error: error.message
    });
  }
});

// Fechar uma sessão
app.post('/api/:key/close-session', async (req, res) => {
  try {
    const { session } = req.body;
    
    if (!session) {
      return res.status(400).json({
        status: false,
        message: 'Nome da sessão é obrigatório'
      });
    }
    
    if (!clients[session]?.client) {
      return res.status(404).json({
        status: false,
        message: 'Sessão não encontrada ou não inicializada'
      });
    }
    
    // Fechar a sessão
    await clients[session].client.close();
    delete clients[session];
    
    res.status(200).json({
      status: true,
      message: 'Sessão encerrada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao fechar sessão:', error);
    res.status(500).json({
      status: false,
      message: 'Erro ao fechar sessão',
      error: error.message
    });
  }
});

// Obter QR Code da sessão
app.get('/api/:key/qrcode', async (req, res) => {
  try {
    const session = req.query.session;
    
    if (!session) {
      return res.status(400).json({
        status: false,
        message: 'Nome da sessão é obrigatório'
      });
    }
    
    if (!clients[session]) {
      return res.status(404).json({
        status: false,
        message: 'Sessão não encontrada. Inicie a sessão primeiro.'
      });
    }
    
    // Aguardar um pouco para garantir que o QR code seja gerado
    if (!clients[session].qrCode) {
      // Aguardar até 10 segundos pelo QR code
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (clients[session].qrCode) break;
      }
    }
    
    if (!clients[session].qrCode) {
      return res.status(404).json({
        status: false,
        message: 'QR Code não disponível. Verifique se a sessão já não está conectada.'
      });
    }
    
    res.status(200).json({
      status: true,
      qrcode: clients[session].qrCode
    });
  } catch (error) {
    console.error('Erro ao obter QR Code:', error);
    res.status(500).json({
      status: false,
      message: 'Erro ao obter QR Code',
      error: error.message
    });
  }
});

// Verificar status da sessão
app.get('/api/:key/session-status', async (req, res) => {
  try {
    const session = req.query.session;
    
    if (!session) {
      return res.status(400).json({
        status: false,
        message: 'Nome da sessão é obrigatório'
      });
    }
    
    let result = 'DISCONNECTED';
    
    if (clients[session]) {
      if (clients[session].status === 'inChat' || clients[session].status === 'isLogged') {
        result = 'CONNECTED';
      } else if (clients[session].status === 'qrReadSuccess') {
        result = 'CONNECTED';
      } else if (clients[session].status === 'qrReadFail') {
        result = 'DISCONNECTED';
      } else if (clients[session].status === 'autocloseCalled') {
        result = 'DISCONNECTED';
      } else if (clients[session].status === 'desconnectedMobile') {
        result = 'DISCONNECTED';
      } else if (clients[session].status === 'notLogged' || clients[session].status === 'deviceNotConnected') {
        result = 'DISCONNECTED';
      } else if (clients[session].status === 'DISCONNECTED') {
        result = 'DISCONNECTED';
      } else if (clients[session].status === 'CONNECTED') {
        result = 'CONNECTED';
      } else if (clients[session].qrCode) {
        result = 'QRCODE';
      } else {
        result = 'STARTING';
      }
    }
    
    res.status(200).json({
      status: true,
      session,
      result,
      statusMessage: clients[session]?.status || 'Não iniciado'
    });
  } catch (error) {
    console.error('Erro ao verificar status da sessão:', error);
    res.status(500).json({
      status: false,
      message: 'Erro ao verificar status da sessão',
      error: error.message
    });
  }
});

// Enviar mensagem de texto
app.post('/api/:key/send-message', async (req, res) => {
  try {
    const { session, phone, message } = req.body;
    
    if (!session || !phone || !message) {
      return res.status(400).json({
        status: false,
        message: 'Sessão, telefone e mensagem são obrigatórios'
      });
    }
    
    if (!clients[session]?.client) {
      return res.status(404).json({
        status: false,
        message: 'Sessão não encontrada ou não inicializada'
      });
    }
    
    // Limpar o número de telefone (remover caracteres não numéricos)
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Verificar se o número existe no WhatsApp
    const isRegistered = await clients[session].client.checkNumberStatus(`${cleanPhone}@c.us`);
    
    if (!isRegistered.numberExists) {
      return res.status(404).json({
        status: false,
        message: 'Número não encontrado no WhatsApp'
      });
    }
    
    // Enviar mensagem
    const result = await clients[session].client.sendText(`${cleanPhone}@c.us`, message);
    
    res.status(200).json({
      status: true,
      message: 'Mensagem enviada com sucesso',
      result
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({
      status: false,
      message: 'Erro ao enviar mensagem',
      error: error.message
    });
  }
});

// Enviar arquivo
app.post('/api/:key/send-file', async (req, res) => {
  try {
    const { session, phone, path, filename, caption } = req.body;
    
    if (!session || !phone || !path) {
      return res.status(400).json({
        status: false,
        message: 'Sessão, telefone e caminho do arquivo são obrigatórios'
      });
    }
    
    if (!clients[session]?.client) {
      return res.status(404).json({
        status: false,
        message: 'Sessão não encontrada ou não inicializada'
      });
    }
    
    // Limpar o número de telefone (remover caracteres não numéricos)
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Verificar se o número existe no WhatsApp
    const isRegistered = await clients[session].client.checkNumberStatus(`${cleanPhone}@c.us`);
    
    if (!isRegistered.numberExists) {
      return res.status(404).json({
        status: false,
        message: 'Número não encontrado no WhatsApp'
      });
    }
    
    // Enviar arquivo
    const result = await clients[session].client.sendFile(
      `${cleanPhone}@c.us`,
      path,
      filename || 'arquivo',
      caption || ''
    );
    
    res.status(200).json({
      status: true,
      message: 'Arquivo enviado com sucesso',
      result
    });
  } catch (error) {
    console.error('Erro ao enviar arquivo:', error);
    res.status(500).json({
      status: false,
      message: 'Erro ao enviar arquivo',
      error: error.message
    });
  }
});

// Obter todos os contatos
app.get('/api/:key/all-contacts', async (req, res) => {
  try {
    const session = req.query.session;
    
    if (!session) {
      return res.status(400).json({
        status: false,
        message: 'Nome da sessão é obrigatório'
      });
    }
    
    if (!clients[session]?.client) {
      return res.status(404).json({
        status: false,
        message: 'Sessão não encontrada ou não inicializada'
      });
    }
    
    // Obter contatos
    const contacts = await clients[session].client.getAllContacts();
    
    res.status(200).json({
      status: true,
      response: contacts
    });
  } catch (error) {
    console.error('Erro ao obter contatos:', error);
    res.status(500).json({
      status: false,
      message: 'Erro ao obter contatos',
      error: error.message
    });
  }
});

// Verificar status de um número
app.get('/api/:key/check-number-status', async (req, res) => {
  try {
    const session = req.query.session;
    const phone = req.query.phone;
    
    if (!session || !phone) {
      return res.status(400).json({
        status: false,
        message: 'Sessão e telefone são obrigatórios'
      });
    }
    
    if (!clients[session]?.client) {
      return res.status(404).json({
        status: false,
        message: 'Sessão não encontrada ou não inicializada'
      });
    }
    
    // Limpar o número de telefone (remover caracteres não numéricos)
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Verificar status do número
    const result = await clients[session].client.checkNumberStatus(`${cleanPhone}@c.us`);
    
    res.status(200).json({
      status: true,
      response: {
        numberExists: result.numberExists || false,
        phone: cleanPhone
      }
    });
  } catch (error) {
    console.error('Erro ao verificar status do número:', error);
    res.status(500).json({
      status: false,
      message: 'Erro ao verificar status do número',
      error: error.message
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor WPPConnect iniciado na porta ${PORT}`);
});