import { Pool } from '@neondatabase/serverless';
import { hashPassword } from './server/auth.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Função para executar uma query
async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

// Função para criar um cliente de teste
async function createTestCustomer() {
  try {
    // Verificar se o cliente já existe
    const existingCustomer = await query(
      'SELECT * FROM customers WHERE document_number = $1',
      ['11122233344']
    );
    
    if (existingCustomer.rows.length > 0) {
      console.log('Cliente de teste já existe.');
      return;
    }
    
    // Criar o cliente
    await query(
      `INSERT INTO customers 
       (name, email, phone, address, address_number, city, state, postal_code, document_number, document_type) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        'Cliente Teste',
        'cliente@teste.com',
        '11987654321',
        'Rua Teste',
        '123',
        'São Paulo',
        'SP',
        '01234567',
        '11122233344',
        'CPF'
      ]
    );
    
    console.log('Cliente de teste criado com sucesso!');
  } catch (error) {
    console.error('Erro ao criar cliente de teste:', error);
  }
}

// Executar seed
async function seed() {
  try {
    await createTestCustomer();
    console.log('Seed concluído com sucesso!');
  } catch (error) {
    console.error('Erro durante o seed:', error);
  } finally {
    pool.end();
  }
}

seed();