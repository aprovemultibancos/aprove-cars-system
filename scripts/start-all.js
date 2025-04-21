/**
 * Script para iniciar tanto o servidor WPPConnect quanto a aplicação principal
 */
const { spawn } = require('child_process');
const path = require('path');

// Iniciar o servidor WPPConnect
const wppConnectProcess = spawn('node', ['server/wppconnect-server.js'], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..')
});

console.log('Servidor WPPConnect iniciado com PID:', wppConnectProcess.pid);

// Iniciar a aplicação principal após 2 segundos para dar tempo ao servidor WPPConnect iniciar
setTimeout(() => {
  const appProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });

  console.log('Aplicação principal iniciada com PID:', appProcess.pid);

  // Lidar com sinais de encerramento
  process.on('SIGINT', () => {
    console.log('Encerrando processos...');
    wppConnectProcess.kill();
    appProcess.kill();
    process.exit(0);
  });

  // Se um dos processos morrer, encerrar tudo
  wppConnectProcess.on('close', (code) => {
    console.log(`Servidor WPPConnect encerrado com código: ${code}`);
    appProcess.kill();
    process.exit(code);
  });

  appProcess.on('close', (code) => {
    console.log(`Aplicação principal encerrada com código: ${code}`);
    wppConnectProcess.kill();
    process.exit(code);
  });
}, 2000);