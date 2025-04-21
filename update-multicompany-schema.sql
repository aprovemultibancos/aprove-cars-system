-- Adicionar campo companyId às tabelas existentes
ALTER TABLE "users" 
ADD COLUMN IF NOT EXISTS "company_id" INTEGER;

-- Adicionar campo companyId às tabelas principais
ALTER TABLE "customers" 
ADD COLUMN IF NOT EXISTS "company_id" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "asaas_id" TEXT;

ALTER TABLE "financings" 
ADD COLUMN IF NOT EXISTS "company_id" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "expenses" 
ADD COLUMN IF NOT EXISTS "company_id" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "personnel" 
ADD COLUMN IF NOT EXISTS "company_id" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "vehicles" 
ADD COLUMN IF NOT EXISTS "company_id" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "sales" 
ADD COLUMN IF NOT EXISTS "company_id" INTEGER NOT NULL DEFAULT 1;

-- Adicionar campo companyId às tabelas de WhatsApp
ALTER TABLE "whatsapp_connections" 
ADD COLUMN IF NOT EXISTS "company_id" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "whatsapp_contacts" 
ADD COLUMN IF NOT EXISTS "company_id" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "whatsapp_groups" 
ADD COLUMN IF NOT EXISTS "company_id" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "whatsapp_templates" 
ADD COLUMN IF NOT EXISTS "company_id" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "whatsapp_campaigns" 
ADD COLUMN IF NOT EXISTS "company_id" INTEGER NOT NULL DEFAULT 1;

-- Adicionar restrições de chave estrangeira APÓS todos os campos serem criados
ALTER TABLE "customers" 
ADD CONSTRAINT IF NOT EXISTS "customers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;

ALTER TABLE "financings" 
ADD CONSTRAINT IF NOT EXISTS "financings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;

ALTER TABLE "expenses" 
ADD CONSTRAINT IF NOT EXISTS "expenses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;

ALTER TABLE "personnel" 
ADD CONSTRAINT IF NOT EXISTS "personnel_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;

ALTER TABLE "vehicles" 
ADD CONSTRAINT IF NOT EXISTS "vehicles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;

ALTER TABLE "sales" 
ADD CONSTRAINT IF NOT EXISTS "sales_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;

ALTER TABLE "whatsapp_connections" 
ADD CONSTRAINT IF NOT EXISTS "whatsapp_connections_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;

ALTER TABLE "whatsapp_contacts" 
ADD CONSTRAINT IF NOT EXISTS "whatsapp_contacts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;

ALTER TABLE "whatsapp_groups" 
ADD CONSTRAINT IF NOT EXISTS "whatsapp_groups_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;

ALTER TABLE "whatsapp_templates" 
ADD CONSTRAINT IF NOT EXISTS "whatsapp_templates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;

ALTER TABLE "whatsapp_campaigns" 
ADD CONSTRAINT IF NOT EXISTS "whatsapp_campaigns_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;