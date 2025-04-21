-- Adicionar coluna para o número de mensagens enviadas e data de último reset
ALTER TABLE whatsapp_connections 
ADD COLUMN IF NOT EXISTS messages_sent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reset_date TIMESTAMP DEFAULT NOW();

-- Atualizar coluna company_id nas tabelas WhatsApp
ALTER TABLE whatsapp_connections 
ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);

-- Adicionar company_id aos contatos WhatsApp
ALTER TABLE whatsapp_contacts 
ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);

-- Adicionar company_id aos grupos WhatsApp
ALTER TABLE whatsapp_groups 
ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);

-- Adicionar company_id aos templates WhatsApp
ALTER TABLE whatsapp_templates 
ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);

-- Adicionar company_id às campanhas WhatsApp
ALTER TABLE whatsapp_campaigns 
ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);

-- Configurar company_id como não nulo após preenchimento adequado
-- Comentado para evitar erros - executar após preencher manualmente os IDs
-- ALTER TABLE whatsapp_connections ALTER COLUMN company_id SET NOT NULL;
-- ALTER TABLE whatsapp_contacts ALTER COLUMN company_id SET NOT NULL;
-- ALTER TABLE whatsapp_groups ALTER COLUMN company_id SET NOT NULL;
-- ALTER TABLE whatsapp_templates ALTER COLUMN company_id SET NOT NULL;
-- ALTER TABLE whatsapp_campaigns ALTER COLUMN company_id SET NOT NULL;

-- Se necessário, atualizar os IDs das empresas existentes
UPDATE whatsapp_connections SET company_id = 1 WHERE company_id IS NULL;
UPDATE whatsapp_contacts SET company_id = 1 WHERE company_id IS NULL;
UPDATE whatsapp_groups SET company_id = 1 WHERE company_id IS NULL;
UPDATE whatsapp_templates SET company_id = 1 WHERE company_id IS NULL;
UPDATE whatsapp_campaigns SET company_id = 1 WHERE company_id IS NULL;