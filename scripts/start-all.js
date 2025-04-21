/**
 * Script para iniciar o servidor principal e o servidor WPPConnect
 */

import { spawn } from 'child_process';

// Iniciar o servidor WPPConnect
console.log('Iniciando o servidor WPPConnect...');
const wppProcess = spawn('node', ['scripts/start-wppconnect-server.cjs'], {
  stdio: 'inherit',
  shell: true
});

wppProcess.on('error', (error) => {
  console.error('Erro ao iniciar servidor WPPConnect:', error);
});

// Esperar um momento para o servidor WPPConnect iniciar
setTimeout(() => {
  // Iniciar o servidor principal
  console.log('Iniciando o servidor principal...');
  const mainProcess = spawn('tsx', ['server/index.ts'], {
    stdio: 'inherit',
    shell: true
  });

  mainProcess.on('error', (error) => {
    console.error('Erro ao iniciar servidor principal:', error);
  });

  // Lidar com o encerramento dos processos
  process.on('SIGINT', () => {
    console.log('Encerrando servidores...');
    wppProcess.kill();
    mainProcess.kill();
    process.exit(0);
  });
}, 2000);

console.log('Iniciando ambos os servidores. Pressione Ctrl+C para encerrar.');