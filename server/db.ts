import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configuração do WebSocket
neonConfig.webSocketConstructor = ws;

// Decide qual conexão usar
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL deve estar configurado. Certifique-se de provisionar um banco de dados.",
  );
}

// Por enquanto, vamos usar a conexão original do DATABASE_URL para resolver o problema
// Isso nos dará tempo para investigar o problema de conexão do Supabase
console.log("Usando conexão padrão DATABASE_URL");
const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({ connectionString });
export const db = drizzle({ client: pool, schema });
