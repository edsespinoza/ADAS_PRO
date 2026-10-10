-- ================================================
-- ADAS PRO — Tabela de leads (captura na landing page)
-- Projeto Supabase: zqydyyticvtmirjzskly
-- Data: 2026-10-10
--
-- Armazena submissões do formulário de contato da landing page
-- (index.html #contactForm) + dados de origem do visitante
-- (UTM / referrer / página / dispositivo / user agent).
--
-- Gravação EXCLUSIVAMENTE via Edge Function `capture-lead`
-- (service_role). Leitura e gestão no painel admin via RLS.
-- ================================================

CREATE TABLE IF NOT EXISTS public.leads (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  -- dados do formulário
  name          text        NOT NULL,
  email         text        NOT NULL,
  phone         text,
  profile       text,
  message       text,

  -- gestão do funil
  status        text        NOT NULL DEFAULT 'new'
                CHECK (status IN ('new','contacted','qualified','won','lost','spam')),

  -- origem / visitante
  source        text        NOT NULL DEFAULT 'form',
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_term      text,
  utm_content   text,
  referrer      text,
  landing_page  text,
  device        text,
  user_agent    text,
  ip_hash       text,

  -- gestão adicional
  notes         text,
  assigned_to   uuid REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_created ON public.leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status  ON public.leads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email   ON public.leads (lower(email));

COMMENT ON TABLE  public.leads IS 'Leads capturados no formulário da landing page (gravação via Edge Function capture-lead)';
COMMENT ON COLUMN public.leads.profile      IS 'Perfil declarado: tecnico|oficina|autocenter|parabrisa|gestor|outro';
COMMENT ON COLUMN public.leads.status       IS 'new|contacted|qualified|won|lost|spam';
COMMENT ON COLUMN public.leads.source       IS 'Origem do lead: form|whatsapp-float|...';
COMMENT ON COLUMN public.leads.ip_hash      IS 'sha256(ip + salt) — nunca o IP cru (LGPD)';
COMMENT ON COLUMN public.leads.landing_page IS 'Path da página de origem (ex.: /)';

-- ────────────────────────────────────────────────
-- updated_at automático
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_leads_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_leads_updated_at();

-- ────────────────────────────────────────────────
-- RLS
-- Denominador comum: `public.is_admin_staff()` (admin/superadmin).
-- Nenhuma policy de INSERT → somente service_role grava.
-- Sem isso, qualquer portador da anon key poderia forjar leads.
-- ────────────────────────────────────────────────
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_select" ON public.leads;
DROP POLICY IF EXISTS "leads_update" ON public.leads;
DROP POLICY IF EXISTS "leads_delete" ON public.leads;

-- SELECT: apenas admin staff
CREATE POLICY "leads_select" ON public.leads
  FOR SELECT USING (public.is_admin_staff());

-- UPDATE: admin staff (status / notas / responsável no painel)
CREATE POLICY "leads_update" ON public.leads
  FOR UPDATE
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

-- DELETE: admin staff (direito ao esquecimento — LGPD)
CREATE POLICY "leads_delete" ON public.leads
  FOR DELETE USING (public.is_admin_staff());

-- Verificação
SELECT 'leads criado com sucesso' AS status;
