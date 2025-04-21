/**
 * Script para iniciar tanto o servidor WPPConnect quanto a aplicação principal
 */
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Iniciar o servidor WPPConnect
console.log('Iniciando servidor WPPConnect...');
const wppconnect = spawn('node', [join(rootDir, 'scripts/start-wppconnect-server.cjs')], {
  stdio: 'inherit',
  cwd: rootDir
});

wppconnect.on('error', (error) => {
  console.error('Erro ao iniciar servidor WPPConnect:', error);
});

// Iniciar o servidor principal
console.log('Iniciando aplicação principal...');
const app = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  cwd: rootDir,
  env: { ...process.env }
});

app.on('error', (error) => {
  console.error('Erro ao iniciar aplicação principal:', error);
});

// Tratamento para encerrar os processos quando o script for terminado
process.on('SIGINT', () => {
  console.log('Encerrando todos os servidores...');
  wppconnect.kill();
  app.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Encerrando todos os servidores...');
  wppconnect.kill();
  app.kill();
  process.exit(0);
});