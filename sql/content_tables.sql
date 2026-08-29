-- ================================================
-- ADAS PRO — Tabelas de conteúdo do api-gateway
-- Projeto Supabase: zqydyyticvtmirjzskly
-- Data: 2026-08-29
--
-- Cria as tabelas referenciadas pela Edge Function `api-gateway`
-- (user_progress, bulletins, articles, quiz_questions, quiz_results)
-- que estavam ausentes do banco. A função usa service_role (ignora RLS);
-- as políticas abaixo cobrem acesso direto autenticado, seguindo o
-- mesmo padrão de `rls_policies.sql`.
--
-- Execute inteiro no SQL Editor do Supabase.
-- ================================================

-- ────────────────────────────────────────────────
-- 1. user_progress — progresso do usuário por material
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_progress (
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id  text        NOT NULL,
  progress    integer     NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  completed   boolean     NOT NULL DEFAULT false,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, content_id)
);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_progress_select_own" ON public.user_progress;
CREATE POLICY "user_progress_select_own" ON public.user_progress
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "user_progress_write_own" ON public.user_progress;
CREATE POLICY "user_progress_write_own" ON public.user_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.user_progress IS 'Progresso de leitura do usuário por material (0-100%)';

-- ────────────────────────────────────────────────
-- 2. articles — artigos editoriais
--    Espelha o shape de `adaspro_articles` (localStorage) em auth.js
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.articles (
  id            text        PRIMARY KEY,
  icon          text        NOT NULL DEFAULT '📝',
  title         text        NOT NULL,
  content       text        NOT NULL DEFAULT '',
  cat           text        NOT NULL DEFAULT '',
  tags          jsonb       NOT NULL DEFAULT '[]'::jsonb,
  access_level  integer     NOT NULL DEFAULT 1 CHECK (access_level BETWEEN 1 AND 4),
  author        text        NOT NULL DEFAULT '',
  author_id     text        NOT NULL DEFAULT '',
  status        text        NOT NULL DEFAULT 'draft',
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_articles_status ON public.articles (status, created_at DESC);
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "articles_select_published" ON public.articles;
CREATE POLICY "articles_select_published" ON public.articles
  FOR SELECT TO authenticated USING (status = 'published' OR public.is_admin());

DROP POLICY IF EXISTS "articles_write_admin" ON public.articles;
CREATE POLICY "articles_write_admin" ON public.articles
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

COMMENT ON TABLE public.articles IS 'Artigos editoriais públicos (status: draft|published|archived)';

-- ────────────────────────────────────────────────
-- 3. bulletins — boletins técnicos
--    Espelha o shape de `adaspro_bulletins` (localStorage) em auth.js
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bulletins (
  id                text        PRIMARY KEY,
  icon              text        NOT NULL DEFAULT '📋',
  title             text        NOT NULL,
  content           text        NOT NULL DEFAULT '',
  cat               text        NOT NULL DEFAULT '',
  type              text        NOT NULL DEFAULT 'novidade',
  severity          text        NOT NULL DEFAULT 'info',
  bulletin_number   text        NOT NULL,
  tags              jsonb       NOT NULL DEFAULT '[]'::jsonb,
  access_level      integer     NOT NULL DEFAULT 1 CHECK (access_level BETWEEN 1 AND 4),
  vehicle_models    jsonb       NOT NULL DEFAULT '[]'::jsonb,
  systems_affected  jsonb       NOT NULL DEFAULT '[]'::jsonb,
  author            text        NOT NULL DEFAULT '',
  author_id         text        NOT NULL DEFAULT '',
  version           text        NOT NULL DEFAULT 'v1.0',
  status            text        NOT NULL DEFAULT 'draft',
  published_at      timestamptz,
  expires_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bulletins_status ON public.bulletins (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulletins_type   ON public.bulletins (type);
ALTER TABLE public.bulletins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bulletins_select_published" ON public.bulletins;
CREATE POLICY "bulletins_select_published" ON public.bulletins
  FOR SELECT TO authenticated USING (status = 'published' OR public.is_admin());

DROP POLICY IF EXISTS "bulletins_write_admin" ON public.bulletins;
CREATE POLICY "bulletins_write_admin" ON public.bulletins
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

COMMENT ON TABLE public.bulletins IS 'Boletins técnicos (type: novidade|atualizacao|alerta|procedimento; severity: info|moderate|critical)';

-- ────────────────────────────────────────────────
-- 4. quiz_questions — gabarito das certificações
--    service_role (api-gateway) usa p/ corrigir; usuário autenticado lê
--    para renderizar as perguntas.
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id                 text        PRIMARY KEY,
  certification_id   text        NOT NULL,
  module_id          text        NOT NULL,
  question           text        NOT NULL,
  options            jsonb       NOT NULL DEFAULT '[]'::jsonb,
  correct_answer     text        NOT NULL,
  points             integer     NOT NULL DEFAULT 1 CHECK (points > 0),
  sort_order         integer     NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_module ON public.quiz_questions (certification_id, module_id, sort_order);
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quiz_questions_select_auth" ON public.quiz_questions;
CREATE POLICY "quiz_questions_select_auth" ON public.quiz_questions
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

-- Não expor o gabarito (correct_answer) a usuários autenticados:
-- privilégio de coluna de SELECT cobre a tabela inteira, mantendo
-- apenas as colunas de renderização. service_role mantém a tabela
-- completa (api-gateway corrige server-side).
REVOKE SELECT ON public.quiz_questions FROM anon, authenticated;
GRANT SELECT (id, certification_id, module_id, question, options, points, sort_order)
  ON public.quiz_questions TO authenticated;

DROP POLICY IF EXISTS "quiz_questions_write_admin" ON public.quiz_questions;
CREATE POLICY "quiz_questions_write_admin" ON public.quiz_questions
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

COMMENT ON TABLE public.quiz_questions IS 'Perguntas e gabarito das certificações';

-- ────────────────────────────────────────────────
-- 5. quiz_results — resultados de quiz (append-only)
-- ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quiz_results (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certification_id  text        NOT NULL,
  module_id         text        NOT NULL,
  score             integer     NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  passed            boolean     NOT NULL DEFAULT false,
  completed_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_results_user ON public.quiz_results (user_id, completed_at DESC);
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quiz_results_select_own" ON public.quiz_results;
CREATE POLICY "quiz_results_select_own" ON public.quiz_results
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "quiz_results_insert_own" ON public.quiz_results;
CREATE POLICY "quiz_results_insert_own" ON public.quiz_results
  FOR INSERT WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.quiz_results IS 'Resultados de quiz das certificações';

-- Verificação
SELECT 'content_tables criadas com sucesso' AS status;
