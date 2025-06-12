-- Adiciona a coluna tracking_parameters à tabela abandoned_carts, se ela não existir.
-- O tipo jsonb é usado para armazenar dados flexíveis como os parâmetros UTM.

ALTER TABLE public.abandoned_carts
ADD COLUMN IF NOT EXISTS tracking_parameters JSONB;