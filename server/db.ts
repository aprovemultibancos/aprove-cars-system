import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Verifica se a conexão com o Supabase está disponível
if (!process.env.SUPABASE_DATABASE_URL) {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL ou SUPABASE_DATABASE_URL precisam ser definidos. Certifique-se de provisionar um banco de dados.",
    );
  }
  console.log("Usando conexão padrão (Neon)");
} else {
  console.log("Usando conexão com Supabase");
}

// Usa a conexão do Supabase se disponível, caso contrário, usa a conexão padrão
const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

export const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, schema });
