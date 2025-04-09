-- Adicionar valores padrão aos campos que estão com problema no schema
ALTER TABLE financings 
ALTER COLUMN released_amount SET DEFAULT 0,
ALTER COLUMN expected_return SET DEFAULT 0;