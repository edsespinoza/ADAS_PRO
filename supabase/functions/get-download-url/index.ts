// ADAS PRO — Edge Function: get-download-url
// Valida permissões no servidor e retorna URL assinada do Storage
// Deploy: supabase functions deploy get-download-url

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import { CONTENT_MAP as CONTENT_CATALOG } from '../_shared/content-map.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin':  'https://adaspro.com.br',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

// Mapa de conteúdo: contentId → { cat, filePath, accessLevel, downloadLevel }
// Mantido server-side para evitar que o cliente forje metadados.
//
// SYNCHRONIZATION: o catálogo vive em _shared/content-map.ts, importado
// também pelo api-gateway. Antes havia duas cópias independentes e elas
// divergiram (o gateway tinha 13 de 23 itens e paths derivados de
// `${cat}/${id}.pdf`, que não existiam no Storage). Adicionar um PDF agora
// exige: _shared/content-map.ts + DEFAULT_CONTENT em js/auth.js + deploy das
// duas funções.
const CONTENT_MAP = CONTENT_CATALOG;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const cl = parseInt(req.headers.get('content-length') || '0');
  if (cl > 8192) return json({ error: 'Payload muito grande.' }, 413);

  try {
    // 1. Validar JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return json({ error: 'Não autorizado.' }, 401);

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) return json({ error: 'Token inválido.' }, 401);

    // MFA: se a conta possui fator configurado mas a sessão ainda é aal1,
    // a 2ª etapa é obrigatória (usuários sem MFA têm nextLevel aal1 — passam)
    const { data: aalData } = await supabaseUser.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2') {
      return json({ error: 'Autenticação em duas etapas (MFA) é obrigatória para esta ação.' }, 403);
    }

    // 2. Buscar permissões do usuário no banco (não confiar no frontend)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role, status, permissions, plan')
      .eq('id', user.id)
      .single();

    if (!userData) return json({ error: 'Usuário não encontrado.' }, 403);
    if (userData.status !== 'active') return json({ error: 'Conta inativa ou pendente de aprovação.' }, 403);

    // 3. Verificar permissão para o conteúdo solicitado
    const { contentId } = await req.json();
    if (!contentId || typeof contentId !== 'string') return json({ error: 'contentId obrigatório.' }, 400);
    if (contentId.length > 64) return json({ error: 'contentId inválido.' }, 400);
    if (!/^[a-z0-9_-]+$/.test(contentId)) return json({ error: 'contentId contém caracteres inválidos.' }, 400);

    const content = CONTENT_MAP[contentId];
    if (!content) return json({ error: 'Conteúdo não encontrado.' }, 404);
    if (!content.filePath) return json({ error: 'Arquivo ainda não disponível.' }, 404);

    const role = userData.role;
    const isStaff = ['admin', 'gestor', 'superadmin'].includes(role);
    const hasPermission = isStaff || (userData.permissions || []).includes(content.cat);

    if (!hasPermission) return json({ error: 'Sem permissão para este conteúdo.' }, 403);

    // 3a. Nível do usuário (plano) — staff (nível 4) sempre passa, como no cliente.
    const PLAN_LEVELS: Record<string, number> = { free:1, modulo:2, pro:3, premium:4 };
    const isStaffLevel = isStaff;
    const userLevel = isStaffLevel ? 4 : PLAN_LEVELS[userData.plan] || 1;

    // 3a.1 Nível mínimo do item (accessLevel/downloadLevel) — espelha canViewContent/
    //      canDownloadContent do cliente. A URL assinada habilita visualização e download,
    //      então o mais restritivo dos dois (downloadLevel) rege — mas validamos ambos.
    if (!isStaffLevel) {
      if (userLevel < (content.accessLevel || 1)) {
        return json({ error: 'Seu plano não permite visualizar este conteúdo.' }, 403);
      }
      if (userLevel < (content.downloadLevel || 2)) {
        return json({ error: 'Seu plano não permite baixar este conteúdo.' }, 403);
      }
    }

    // 3b. Verificar configuração do módulo (moduleAccess) — desativado ou nível mínimo.
    //     Staff (admin/gestor/superadmin) sempre passa, como no cliente.
    const { data: settingsData } = await supabaseAdmin
      .from('settings')
      .select('value')
      .eq('key', 'app')
      .maybeSingle();
    const mod = settingsData?.value?.moduleAccess?.[content.cat];
    if (mod && mod.enabled === false && !isStaff) return json({ error: 'Este módulo está desativado.' }, 403);
    if (mod && mod.minLevel && !isStaff) {
      if (userLevel < mod.minLevel) {
        return json({ error: 'Seu plano não permite acesso a este módulo.' }, 403);
      }
    }

    // 4. Gerar URL assinada — expira em 1 hora
    const { data: signedData, error: signErr } = await supabaseAdmin.storage
      .from('materiais')
      .createSignedUrl(content.filePath, 3600);

    if (signErr || !signedData) return json({ error: 'Erro ao gerar URL de download.' }, 500);

    // 5. Registrar download em audit_logs — fail-safe: bloqueia se log falhar
    const { error: logErr } = await supabaseAdmin.from('audit_logs').insert({
      action: 'download_content',
      actor_id: user.id,
      target_id: contentId,
      details: { cat: content.cat, filePath: content.filePath },
      created_at: new Date().toISOString(),
    });
    if (logErr) {
      console.error('[get-download-url] logAudit falhou:', logErr.message);
      return json({ error: 'Erro ao registrar auditoria de download.' }, 500);
    }

    return json({ ok: true, url: signedData.signedUrl, expiresIn: 3600 });

  } catch (e) {
    console.error('[get-download-url] unhandled:', e instanceof Error ? e.message : 'unknown');
    return json({ error: 'Erro interno do servidor.' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}
