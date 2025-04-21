/**
 * Script para iniciar o servidor WPPConnect
 */

const { create } = require('@wppconnect-team/wppconnect');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Configurações
const PORT = process.env.WPPCONNECT_PORT || 21465;
const API_KEY = process.env.WPPCONNECT_KEY || 'seu-token';
const SESSIONS_DIR = path.resolve(process.cwd(), 'whatsapp-sessions');

// Garantir que o diretório de sessões existe
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// Armazenar clientes ativos
const clients = {};

// Configurar Express
const app = express();
app.use(cors());
app.use(express.json());

// Middleware de autenticação
const authMiddleware = (req, res, next) => {
  const token = req.query.token || req.headers['x-api-key'];
  
  if (!token || token !== API_KEY) {
    return res.status(401).json({
      status: false,
      message: 'Token de API inválido'
    });
  }
  
  next();
};

// Rota raiz
app.get('/', (req, res) => {
  res.send('Servidor WPPConnect ativo!');
});

// Iniciar uma sessão
app.post('/api/:token/start-session', async (req, res) => {
  const token = req.params.token;
  if (token !== API_KEY) {
    return res.status(401).json({
      status: false,
      message: 'Token de API inválido'
    });
  }
  
  const { session } = req.body;
  if (!session) {
    return res.status(400).json({
      status: false,
      message: 'Nome da sessão não fornecido'
    });
  }
  
  // Verificar se a sessão já existe
  if (clients[session]) {
    return res.status(200).json({
      status: true,
      message: 'Sessão já está ativa'
    });
  }
  
  try {
    // Inicializar cliente WPPConnect
    const client = await create({
      session,
      catchQR: (base64Qr, asciiQR, attempts, urlCode) => {
        // Armazenar QR code para esta sessão
        clients[session] = {
          ...clients[session],
          qrCode: base64Qr,
          status: 'QRCODE'
        };
      },
      statusFind: (statusSession, session) => {
        clients[session] = {
          ...clients[session],
          status: statusSession
        };
      },
      folderNameToken: SESSIONS_DIR,
      headless: true,
      useChrome: false,
      debug: false,
      logQR: false,
      browserWS: '',
      autoClose: 60000,
      puppeteerOptions: {
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      }
    });
    
    clients[session] = {
      ...clients[session],
      client,
      status: 'STARTING'
    };
    
    client.onStateChange((state) => {
      clients[session].status = state;
    });
    
    await client.isConnected();
    
    return res.status(200).json({
      status: true,
      message: 'Sessão iniciada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao iniciar sessão:', error);
    return res.status(500).json({
      status: false,
      message: 'Erro ao iniciar sessão',
      error: error.message
    });
  }
});

// Obter QR Code
app.get('/api/:token/qrcode', authMiddleware, (req, res) => {
  const { session } = req.query;
  
  if (!session) {
    return res.status(400).json({
      status: false,
      message: 'Nome da sessão não fornecido'
    });
  }
  
  const clientInfo = clients[session];
  if (!clientInfo) {
    return res.status(404).json({
      status: false,
      message: 'Sessão não encontrada'
    });
  }
  
  return res.status(200).json({
    status: true,
    qrcode: clientInfo.qrCode
  });
});

// Verificar status da sessão
app.get('/api/:token/session-status', authMiddleware, (req, res) => {
  const { session } = req.query;
  
  if (!session) {
    return res.status(400).json({
      status: false,
      message: 'Nome da sessão não fornecido'
    });
  }
  
  const clientInfo = clients[session];
  if (!clientInfo) {
    return res.status(404).json({
      status: false,
      message: 'Sessão não encontrada'
    });
  }
  
  return res.status(200).json({
    status: true,
    result: clientInfo.status
  });
});

// Enviar mensagem de texto
app.post('/api/:token/send-message', authMiddleware, async (req, res) => {
  const { session, phone, message } = req.body;
  
  if (!session || !phone || !message) {
    return res.status(400).json({
      status: false,
      message: 'Parâmetros incompletos (session, phone, message)'
    });
  }
  
  const clientInfo = clients[session];
  if (!clientInfo || !clientInfo.client) {
    return res.status(404).json({
      status: false,
      message: 'Sessão não encontrada ou desconectada'
    });
  }
  
  try {
    // Formatar número se necessário
    const formattedPhone = formatPhone(phone);
    
    // Verificar se o número existe no WhatsApp
    const isRegistered = await clientInfo.client.checkNumberStatus(formattedPhone);
    
    if (!isRegistered.canReceiveMessage) {
      return res.status(400).json({
        status: false,
        message: 'Número não registrado no WhatsApp'
      });
    }
    
    // Enviar mensagem
    const result = await clientInfo.client.sendText(formattedPhone, message);
    
    return res.status(200).json({
      status: true,
      result
    });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    return res.status(500).json({
      status: false,
      message: 'Erro ao enviar mensagem',
      error: error.message
    });
  }
});

// Enviar arquivo
app.post('/api/:token/send-file', authMiddleware, async (req, res) => {
  const { session, phone, path, filename, caption } = req.body;
  
  if (!session || !phone || !path) {
    return res.status(400).json({
      status: false,
      message: 'Parâmetros incompletos (session, phone, path)'
    });
  }
  
  const clientInfo = clients[session];
  if (!clientInfo || !clientInfo.client) {
    return res.status(404).json({
      status: false,
      message: 'Sessão não encontrada ou desconectada'
    });
  }
  
  try {
    // Formatar número se necessário
    const formattedPhone = formatPhone(phone);
    
    // Verificar se o número existe no WhatsApp
    const isRegistered = await clientInfo.client.checkNumberStatus(formattedPhone);
    
    if (!isRegistered.canReceiveMessage) {
      return res.status(400).json({
        status: false,
        message: 'Número não registrado no WhatsApp'
      });
    }
    
    // Enviar arquivo
    const result = await clientInfo.client.sendFile(
      formattedPhone,
      path,
      filename || 'file',
      caption || ''
    );
    
    return res.status(200).json({
      status: true,
      result
    });
  } catch (error) {
    console.error('Erro ao enviar arquivo:', error);
    return res.status(500).json({
      status: false,
      message: 'Erro ao enviar arquivo',
      error: error.message
    });
  }
});

// Verificar número
app.get('/api/:token/check-number-status', authMiddleware, async (req, res) => {
  const { session, phone } = req.query;
  
  if (!session || !phone) {
    return res.status(400).json({
      status: false,
      message: 'Parâmetros incompletos (session, phone)'
    });
  }
  
  const clientInfo = clients[session];
  if (!clientInfo || !clientInfo.client) {
    return res.status(404).json({
      status: false,
      message: 'Sessão não encontrada ou desconectada'
    });
  }
  
  try {
    // Formatar número se necessário
    const formattedPhone = formatPhone(phone);
    
    // Verificar se o número existe no WhatsApp
    const result = await clientInfo.client.checkNumberStatus(formattedPhone);
    
    return res.status(200).json({
      status: true,
      response: {
        numberExists: result.canReceiveMessage
      }
    });
  } catch (error) {
    console.error('Erro ao verificar número:', error);
    return res.status(500).json({
      status: false,
      message: 'Erro ao verificar número',
      error: error.message
    });
  }
});

// Obter todos os contatos
app.get('/api/:token/all-contacts', authMiddleware, async (req, res) => {
  const { session } = req.query;
  
  if (!session) {
    return res.status(400).json({
      status: false,
      message: 'Nome da sessão não fornecido'
    });
  }
  
  const clientInfo = clients[session];
  if (!clientInfo || !clientInfo.client) {
    return res.status(404).json({
      status: false,
      message: 'Sessão não encontrada ou desconectada'
    });
  }
  
  try {
    // Obter todos os contatos
    const contacts = await clientInfo.client.getAllContacts();
    
    return res.status(200).json({
      status: true,
      response: contacts
    });
  } catch (error) {
    console.error('Erro ao obter contatos:', error);
    return res.status(500).json({
      status: false,
      message: 'Erro ao obter contatos',
      error: error.message
    });
  }
});

// Desconectar sessão
app.post('/api/:token/logout-session', authMiddleware, async (req, res) => {
  const { session } = req.body;
  
  if (!session) {
    return res.status(400).json({
      status: false,
      message: 'Nome da sessão não fornecido'
    });
  }
  
  const clientInfo = clients[session];
  if (!clientInfo || !clientInfo.client) {
    return res.status(404).json({
      status: false,
      message: 'Sessão não encontrada ou já desconectada'
    });
  }
  
  try {
    // Desconectar cliente
    await clientInfo.client.logout();
    delete clients[session];
    
    return res.status(200).json({
      status: true,
      message: 'Sessão desconectada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao desconectar sessão:', error);
    return res.status(500).json({
      status: false,
      message: 'Erro ao desconectar sessão',
      error: error.message
    });
  }
});

// Função para formatar números de telefone
function formatPhone(phone) {
  // Remover caracteres não numéricos
  let formattedPhone = phone.replace(/\D/g, '');
  
  // Verificar se já tem código do país
  if (!formattedPhone.startsWith('55')) {
    formattedPhone = '55' + formattedPhone;
  }
  
  // Adicionar @ no final para formato correto do WPPConnect
  formattedPhone = formattedPhone + '@c.us';
  
  return formattedPhone;
}

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`Servidor WPPConnect rodando na porta ${PORT}`);
  console.log(`Token de API: ${API_KEY}`);
});

// Tratar desligamento do processo
process.on('SIGINT', async () => {
  console.log('Desligando servidor WPPConnect...');
  
  // Desconectar todas as sessões
  for (const session in clients) {
    if (clients[session] && clients[session].client) {
      try {
        await clients[session].client.close();
      } catch (error) {
        console.error(`Erro ao fechar sessão ${session}:`, error);
      }
    }
  }
  
  server.close(() => {
    console.log('Servidor WPPConnect encerrado.');
    process.exit(0);
  });
});

module.exports = server;