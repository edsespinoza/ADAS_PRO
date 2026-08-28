-- ================================================
-- ADAS PRO — Tabela de rate limiting compartilhado (rate_limits)
-- Executar no SQL Editor do Supabase (ou supabase db push)
--
-- Substitui o rate limit in-memory (Map) da Edge Function api-gateway,
-- que era por-instância e resetava em cold start. Com esta tabela, o
-- contador é compartilhado entre todas as instâncias e sobrevive a
-- restarts — o que impede contornar o limite reiniciando a function.
-- ================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  bucket    text        NOT NULL,   -- ex.: 'api:adas_live_xxx' ou 'jwt:<userId>'
  window    timestamptz NOT NULL,   -- início da janela atual (1 min)
  count     integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window)
);

-- Consulta por bucket (janela atual)
CREATE INDEX IF NOT EXISTS idx_rate_limits_bucket ON public.rate_limits (bucket);

-- RLS: nenhum papel autenticado lê/grava; somente service_role (Edge Function)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rate_limits_none" ON public.rate_limits;
CREATE POLICY "rate_limits_none" ON public.rate_limits
  FOR ALL USING (false) WITH CHECK (false);

-- Comentários
COMMENT ON TABLE  public.rate_limits IS 'Contadores de rate limit compartilhados do api-gateway (janela de 1 minuto)';
COMMENT ON COLUMN public.rate_limits.bucket IS 'Chave do cliente (x-api-key ou userId do JWT)';
COMMENT ON COLUMN public.rate_limits.window  IS 'Início da janela de 1 minuto';

-- ================================================
-- Função de incremento atômico (chamada via RPC pela Edge Function)
-- Segura para concorrência: usa INSERT ... ON CONFLICT DO UPDATE.
-- Retorna a contagem pós-incremento.
-- ================================================
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  p_bucket text,
  p_window timestamptz,
  p_limit integer,
  p_window_ms integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
BEGIN
  INSERT INTO public.rate_limits (bucket, window, count)
  VALUES (p_bucket, p_window, 1)
  ON CONFLICT (bucket, window)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO new_count;

  -- Limpeza best-effort: remove janelas velhas (fora do dobro da janela) para
  -- evitar crescimento infinito da tabela. Não é transacional com o upsert.
  DELETE FROM public.rate_limits
  WHERE window < now() - make_interval(secs => (p_window_ms * 2) / 1000.0);

  RETURN new_count;
END;
$$;

-- Verificação
SELECT 'rate_limits criado com sucesso' AS status;
