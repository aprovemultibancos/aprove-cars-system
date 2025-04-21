/**
 * Script para iniciar tanto o servidor principal quanto o servidor WPPConnect
 */

const { spawn } = require('child_process');
const path = require('path');

// Caminhos dos scripts
const mainServerScript = 'tsx server/index.ts';
const wppConnectServerScript = 'node scripts/start-wppconnect-server.cjs';

// Cores para as saídas no console
const colors = {
  main: '\x1b[36m',  // ciano
  wpp: '\x1b[32m',   // verde
  error: '\x1b[31m', // vermelho
  reset: '\x1b[0m'   // resetar cor
};

// Prefixos para as saídas
const prefixes = {
  main: `${colors.main}[SERVIDOR PRINCIPAL]${colors.reset}`,
  wpp: `${colors.wpp}[SERVIDOR WPPCONNECT]${colors.reset}`,
  error: `${colors.error}[ERRO]${colors.reset}`
};

// Função para iniciar um processo
function startProcess(command, prefix) {
  const parts = command.split(' ');
  const proc = spawn(parts[0], parts.slice(1), {
    shell: true,
    stdio: 'pipe',
    env: { ...process.env }
  });

  // Manipular saída padrão
  proc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.log(`${prefix} ${line}`);
      }
    });
  });

  // Manipular saída de erro
  proc.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        console.error(`${prefixes.error} ${prefix} ${line}`);
      }
    });
  });

  // Manipular fechamento do processo
  proc.on('close', (code) => {
    console.log(`${prefix} Processo encerrado com código ${code}`);
  });

  return proc;
}

console.log('Iniciando servidores...');

// Iniciar servidor WPPConnect
const wppConnectServer = startProcess(wppConnectServerScript, prefixes.wpp);

// Aguardar 2 segundos para o servidor WPPConnect iniciar antes de iniciar o servidor principal
setTimeout(() => {
  // Iniciar servidor principal
  const mainServer = startProcess(mainServerScript, prefixes.main);

  // Lidar com o encerramento do processo
  process.on('SIGINT', () => {
    console.log('\nEncerrando servidores...');
    mainServer.kill();
    wppConnectServer.kill();
    
    // Dar um tempo para os processos encerrarem corretamente
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  });
}, 2000);

console.log('Ambos servidores inicializados.');