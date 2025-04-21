-- Criar tabelas para o sistema de WhatsApp

-- Conexões WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'disconnected',
  qr_code TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_connection TIMESTAMP,
  daily_limit INTEGER DEFAULT 50
);

-- Contatos WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  customer_id INTEGER REFERENCES customers(id),
  tags TEXT[],
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_message_sent TIMESTAMP,
  is_blocked BOOLEAN DEFAULT FALSE
);

-- Grupos WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_groups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  total_contacts INTEGER DEFAULT 0
);

-- Relação entre Grupos e Contatos
CREATE TABLE IF NOT EXISTS whatsapp_group_contacts (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES whatsapp_groups(id),
  contact_id INTEGER NOT NULL REFERENCES whatsapp_contacts(id)
);

-- Templates de Mensagens
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  has_media BOOLEAN DEFAULT FALSE,
  media_type TEXT,
  media_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Campanhas WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_id INTEGER NOT NULL REFERENCES whatsapp_templates(id),
  connection_id INTEGER NOT NULL REFERENCES whatsapp_connections(id),
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_for TIMESTAMP,
  completed_at TIMESTAMP,
  total_contacts INTEGER DEFAULT 0,
  sent_messages INTEGER DEFAULT 0,
  delivered_messages INTEGER DEFAULT 0,
  read_messages INTEGER DEFAULT 0,
  failed_messages INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  min_interval INTEGER NOT NULL DEFAULT 1,
  max_interval INTEGER NOT NULL DEFAULT 3,
  start_time TEXT NOT NULL DEFAULT '08:00',
  end_time TEXT NOT NULL DEFAULT '18:00'
);

-- Alvos das Campanhas
CREATE TABLE IF NOT EXISTS whatsapp_campaign_targets (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER NOT NULL REFERENCES whatsapp_campaigns(id),
  group_id INTEGER REFERENCES whatsapp_groups(id),
  contact_id INTEGER REFERENCES whatsapp_contacts(id),
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  failed_at TIMESTAMP,
  failure_reason TEXT
);