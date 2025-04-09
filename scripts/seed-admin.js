import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import path from 'path';
import crypto from 'crypto';
import { promisify } from 'util';

neonConfig.webSocketConstructor = ws;

// Reimplementação da função hashPassword do servidor
const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function createAdmin() {
  console.log('Iniciando criação de usuário administrador padrão...');
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL deve ser configurada. Certifique-se de provisionar um banco de dados.');
    process.exit(1);
  }

  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Verificar se tabela users existe
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM 
          information_schema.tables 
        WHERE 
          table_schema = 'public' AND 
          table_name = 'users'
      )
    `);

    if (!tableExists.rows[0].exists) {
      console.log('Tabela users não existe. Criando...');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        )
      `);
      console.log('Tabela users criada com sucesso.');
    }

    // Verificar se já existe administrador
    const adminExists = await pool.query(`
      SELECT * FROM users WHERE role = 'admin' LIMIT 1
    `);

    if (adminExists.rows.length > 0) {
      console.log('Já existe um usuário administrador no sistema.');
      const admin = adminExists.rows[0];
      console.log(`Nome de usuário: ${admin.username}`);
      console.log(`Nome: ${admin.name}`);
      console.log(`Email: ${admin.email}`);
      console.log('Senha: (oculta por segurança)');
      process.exit(0);
    }

    // Criar administrador padrão
    const hashedPassword = await hashPassword('admin123');
    
    await pool.query(`
      INSERT INTO users (username, password, name, email, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      'admin', 
      hashedPassword, 
      'Administrador', 
      'admin@aprove.com', 
      'admin', 
      true
    ]);

    console.log('Usuário administrador criado com sucesso:');
    console.log('Nome de usuário: admin');
    console.log('Senha: admin123');
    console.log('Nome: Administrador');
    console.log('Email: admin@aprove.com');
    console.log('Papel: Administrador');
    console.log('\nAVISO: Altere a senha padrão após o primeiro login!');

    await pool.end();
  } catch (error) {
    console.error('Erro ao criar usuário administrador:', error);
    process.exit(1);
  }
}

createAdmin();