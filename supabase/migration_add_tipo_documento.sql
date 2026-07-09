-- Add tipo_documento column to comprovantes_entrega
ALTER TABLE comprovantes_entrega ADD COLUMN IF NOT EXISTS tipo_documento TEXT DEFAULT 'entrega';

-- Update existing comprovantes based on their contract's tipoDocumento
UPDATE comprovantes_entrega ce
SET tipo_documento = c.tipo_documento
FROM contratos c
WHERE ce.contrato_id = c.id AND c.tipo_documento IS NOT NULL;

-- For comprovantes without a linked contract, check if they look like devolucao
-- (valor = 0 or contract number pattern)
UPDATE comprovantes_entrega
SET tipo_documento = 'entrega'
WHERE tipo_documento IS NULL;
