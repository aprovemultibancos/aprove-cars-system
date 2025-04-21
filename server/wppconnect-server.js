// Este é um script de inicialização para o servidor WPPConnect
// Ele será usado pelo workflow do Replit

import { spawn } from 'child_process';
import path from 'path';

// Iniciar o servidor WPPConnect
const serverProcess = spawn('node', ['scripts/start-wppconnect-server.cjs'], {
  stdio: 'inherit',
  shell: true
});

// Lidar com o encerramento do processo
process.on('SIGINT', () => {
  console.log('Encerrando servidor WPPConnect...');
  serverProcess.kill();
  process.exit(0);
});

// Lidar com erros do processo filho
serverProcess.on('error', (error) => {
  console.error('Erro ao iniciar servidor WPPConnect:', error);
  process.exit(1);
});

// Lidar com o encerramento do processo filho
serverProcess.on('close', (code) => {
  console.log(`Servidor WPPConnect encerrado com código ${code}`);
  process.exit(code);
});

// Manter o processo principal rodando
console.log('Servidor WPPConnect iniciado em segundo plano.');