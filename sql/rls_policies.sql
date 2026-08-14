-- ================================================
-- ADAS PRO — Row Level Security (RLS)
-- Projeto Supabase: zqydyyticvtmirjzskly
-- Data: 2026-04-25
-- Execute inteiro no SQL Editor do Supabase
-- ================================================


-- ────────────────────────────────────────────────
-- 1. FUNÇÕES AUXILIARES (SECURITY DEFINER)
--    Executam como owner (postgres), ignoram RLS
--    → evitam recursão infinita nas políticas
-- ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.get_my_role() IN ('admin', 'gestor', 'superadmin');
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.get_my_role() = 'superadmin';
$$;

-- Nível numérico de cada role (membro=1 · gestor=2 · admin=3 · superadmin=4)
CREATE OR REPLACE FUNCTION public.role_level(r text)
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE r
    WHEN 'superadmin' THEN 4
    WHEN 'admin'      THEN 3
    WHEN 'gestor'     THEN 2
    WHEN 'membro'     THEN 1
    ELSE 0 END;
$$;

-- O caller só pode gerenciar (inserir/atualizar) contas com role ESTRITAMENTE
-- inferior à sua — admin não promove outro admin, gestor não age sobre gestores.
CREATE OR REPLACE FUNCTION public.can_manage_role(target_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.role_level(target_role) < public.role_level(public.get_my_role());
$$;

-- Staff com poder de CRIAR contas: apenas admin e superadmin (gestor não cria).
CREATE OR REPLACE FUNCTION public.is_admin_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.get_my_role() IN ('admin', 'superadmin');
$$;


-- ────────────────────────────────────────────────
-- 2. TABELA: public.users
-- ────────────────────────────────────────────────

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas (idempotente)
DROP POLICY IF EXISTS "users_select"          ON public.users;
DROP POLICY IF EXISTS "users_insert"          ON public.users;
DROP POLICY IF EXISTS "users_update"          ON public.users;
DROP POLICY IF EXISTS "users_delete"          ON public.users;

-- SELECT: próprio usuário OU admin+
CREATE POLICY "users_select" ON public.users
  FOR SELECT
  USING (
    auth.uid() = id
    OR public.is_admin()
  );

-- INSERT: novo usuário insere o próprio perfil (registro)
--         role deve ser 'membro' e status 'pending' — impede registro como admin
--         superadmin cria qualquer conta (inclusive superadmin);
--         admin cria apenas roles inferiores (membro/gestor — via can_manage_role);
--         gestor NÃO cria contas;
--         registro próprio nasce SEM privilégios: role=membro, status=pending,
--         permissions/plan/"accessType"/"accessExpires"/"boughtModules" zerados
--         (impede auto-inflação de permissões)
CREATE POLICY "users_insert" ON public.users
  FOR INSERT
  WITH CHECK (
    public.is_superadmin()
    OR (
      public.is_admin_staff()
      AND public.can_manage_role(role)
    )
    OR (
      auth.uid() = id
      AND role          = 'membro'
      AND status        = 'pending'
      AND permissions   = '{}'
      AND plan          = 'free'
      AND "accessType"  = 'trial'
      AND "accessExpires" IS NULL
    )
  );

-- UPDATE: superadmin altera qualquer usuário;
--         admin+ altera apenas roles inferiores (can_manage_role lê a role ALVO);
--         membro só altera o próprio registro e NÃO pode tocar em campos de
--         privilégio (role/status/permissions/plan/"accessType"/"accessExpires"/
--         "boughtModules") — WITH CHECK compara com os valores atuais
CREATE POLICY "users_update" ON public.users
  FOR UPDATE
  USING (
    auth.uid() = id
    OR public.is_admin()
  )
  WITH CHECK (
    public.is_superadmin()
    OR (
      public.is_admin()
      AND public.can_manage_role(role)
    )
    OR (
      auth.uid() = id
      AND role          IS NOT DISTINCT FROM (SELECT role          FROM public.users WHERE id = auth.uid())
      AND status        IS NOT DISTINCT FROM (SELECT status        FROM public.users WHERE id = auth.uid())
      AND permissions   IS NOT DISTINCT FROM (SELECT permissions   FROM public.users WHERE id = auth.uid())
      AND plan          IS NOT DISTINCT FROM (SELECT plan          FROM public.users WHERE id = auth.uid())
      AND "accessType"  IS NOT DISTINCT FROM (SELECT "accessType"  FROM public.users WHERE id = auth.uid())
      AND "accessExpires" IS NOT DISTINCT FROM (SELECT "accessExpires" FROM public.users WHERE id = auth.uid())
      AND "boughtModules" IS NOT DISTINCT FROM (SELECT "boughtModules" FROM public.users WHERE id = auth.uid())
    )
  );

-- DELETE: apenas superadmin pode excluir usuários
CREATE POLICY "users_delete" ON public.users
  FOR DELETE
  USING (
    public.is_superadmin()
  );


-- ────────────────────────────────────────────────
-- 3. TABELA: public.tickets
-- ────────────────────────────────────────────────

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets_select" ON public.tickets;
DROP POLICY IF EXISTS "tickets_insert" ON public.tickets;
DROP POLICY IF EXISTS "tickets_update" ON public.tickets;
DROP POLICY IF EXISTS "tickets_delete" ON public.tickets;

-- SELECT: dono do ticket OU admin+
CREATE POLICY "tickets_select" ON public.tickets
  FOR SELECT
  USING (
    auth.uid()::text = "userId"
    OR public.is_admin()
  );

-- INSERT: usuário autenticado cria ticket para si mesmo
CREATE POLICY "tickets_insert" ON public.tickets
  FOR INSERT
  WITH CHECK (
    auth.uid()::text = "userId"
  );

-- UPDATE: admin+ pode atualizar (responder, mudar status)
--         membro pode atualizar apenas seus próprios tickets
CREATE POLICY "tickets_update" ON public.tickets
  FOR UPDATE
  USING (
    auth.uid()::text = "userId"
    OR public.is_admin()
  );

-- DELETE: apenas admin+
CREATE POLICY "tickets_delete" ON public.tickets
  FOR DELETE
  USING (
    public.is_admin()
  );


-- ────────────────────────────────────────────────
-- 4. TABELA: public.notifications
-- ────────────────────────────────────────────────

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_select" ON public.notifications;
DROP POLICY IF EXISTS "notif_insert" ON public.notifications;
DROP POLICY IF EXISTS "notif_update" ON public.notifications;
DROP POLICY IF EXISTS "notif_delete" ON public.notifications;

-- SELECT: notificações do próprio usuário OU admin+
CREATE POLICY "notif_select" ON public.notifications
  FOR SELECT
  USING (
    auth.uid()::text = "userId"
    OR public.is_admin()
  );

-- INSERT: usuário autenticado insere notificação sobre si
--         OU admin+ insere qualquer notificação
CREATE POLICY "notif_insert" ON public.notifications
  FOR INSERT
  WITH CHECK (
    auth.uid()::text = "userId"
    OR public.is_admin()
  );

-- UPDATE: próprio usuário marca como lido OU admin+
CREATE POLICY "notif_update" ON public.notifications
  FOR UPDATE
  USING (
    auth.uid()::text = "userId"
    OR public.is_admin()
  );

-- DELETE: admin+ pode limpar notificações
CREATE POLICY "notif_delete" ON public.notifications
  FOR DELETE
  USING (
    public.is_admin()
  );


-- ────────────────────────────────────────────────
-- 5. TABELA: public.settings (configurações globais)
--    key/value jsonb — contém moduleAccess (módulos ativos/nível mínimo)
-- ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select" ON public.settings;
DROP POLICY IF EXISTS "settings_insert" ON public.settings;
DROP POLICY IF EXISTS "settings_update" ON public.settings;
DROP POLICY IF EXISTS "settings_delete" ON public.settings;

-- SELECT: qualquer usuário autenticado (membros leem moduleAccess p/ filtrar UI)
CREATE POLICY "settings_select" ON public.settings
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- INSERT/UPDATE/DELETE: apenas admin+ (gestor não gerencia configurações)
CREATE POLICY "settings_insert" ON public.settings
  FOR INSERT
  WITH CHECK (public.is_admin_staff());

CREATE POLICY "settings_update" ON public.settings
  FOR UPDATE
  USING (public.is_admin_staff());

CREATE POLICY "settings_delete" ON public.settings
  FOR DELETE
  USING (public.is_admin_staff());


-- ────────────────────────────────────────────────
-- 6. VERIFICAÇÃO FINAL
-- ────────────────────────────────────────────────

-- Confirma que RLS está ativo nas 4 tabelas
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'tickets', 'notifications', 'settings')
ORDER BY tablename;

-- Lista todas as políticas criadas
SELECT
  tablename,
  policyname,
  cmd        AS operation,
  qual       AS using_expr,
  with_check AS check_expr
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'tickets', 'notifications', 'settings')
ORDER BY tablename, policyname;
