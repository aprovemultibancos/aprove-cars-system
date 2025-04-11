-- Adicionar a coluna status à tabela expenses com valor padrão 'pending'
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid'));

-- Atualizar registros existentes (opcionalmente)
UPDATE expenses SET status = 'pending' WHERE status IS NULL;