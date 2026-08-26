// ADAS PRO — Edge Function: get-download-url
// Valida permissões no servidor e retorna URL assinada do Storage
// Deploy: supabase functions deploy get-download-url

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

const corsHeaders = {
  'Access-Control-Allow-Origin':  'https://adaspro.com.br',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

// Mapa de conteúdo: contentId → { cat, filePath, accessLevel, downloadLevel }
// Mantido server-side para evitar que o cliente forje metadados.
// SYNCHRONIZATION: accessLevel/downloadLevel devem refletir DEFAULT_CONTENT em js/auth.js
// e CONTENT_MAP deve ser mantido em sincronia com o catálogo (novo PDF = editar ambos + deploy).
const CONTENT_MAP: Record<string, { cat: string; filePath: string | null; accessLevel: number; downloadLevel: number }> = {
  'honda-lkas':      { cat:'honda',      filePath: 'honda/honda-lkas-calibration.pdf', accessLevel:2, downloadLevel:3 },
  'honda-avm':       { cat:'honda',      filePath: 'honda/honda-avm-360.pdf',           accessLevel:2, downloadLevel:3 },
  'honda-acc':       { cat:'honda',      filePath: null,                                accessLevel:2, downloadLevel:3 },
  'toyota-ldw':      { cat:'toyota',     filePath: 'toyota/toyota-ldw-120.pdf',         accessLevel:2, downloadLevel:3 },
  'toyota-180':      { cat:'toyota',     filePath: 'toyota/toyota-lda-180.pdf',         accessLevel:2, downloadLevel:3 },
  'toyota-avm':      { cat:'toyota',     filePath: 'toyota/toyota-avm.pdf',             accessLevel:2, downloadLevel:3 },
  'nissan-lka':      { cat:'nissan',     filePath: 'nissan/nissan-lka-tipo1.pdf',       accessLevel:2, downloadLevel:3 },
  'nissan-propilot': { cat:'nissan',     filePath: 'nissan/nissan-propilot.pdf',        accessLevel:2, downloadLevel:3 },
  'nissan-radar':    { cat:'nissan',     filePath: null,                                accessLevel:2, downloadLevel:3 },
  'subaru-type1':    { cat:'subaru',     filePath: 'subaru/subaru-eyesight-tipo1.pdf',  accessLevel:3, downloadLevel:3 },
  'subaru-type2':    { cat:'subaru',     filePath: 'subaru/subaru-eyesight-tipo2.pdf',  accessLevel:3, downloadLevel:3 },
  'hyundai-avm':     { cat:'hyundai',    filePath: 'hyundai/hyundai-avm.pdf',           accessLevel:3, downloadLevel:3 },
  'hyundai-radar':   { cat:'hyundai',    filePath: 'hyundai/hyundai-radar-acc.pdf',     accessLevel:3, downloadLevel:3 },
  'audi-lidar':      { cat:'vag',        filePath: 'vag/audi-lidar-vas6430.pdf',        accessLevel:3, downloadLevel:4 },
  'vag-avm':         { cat:'vag',        filePath: 'vag/vag-avm.pdf',                   accessLevel:3, downloadLevel:4 },
  'mercedes-night':  { cat:'mercedes',   filePath: 'mercedes/mercedes-night-vision.pdf',accessLevel:3, downloadLevel:4 },
  'mercedes-rcw':    { cat:'mercedes',   filePath: 'mercedes/mercedes-rcw.pdf',         accessLevel:3, downloadLevel:4 },
  'ford-avm':        { cat:'ford',       filePath: 'ford/ford-avm-360.pdf',             accessLevel:3, downloadLevel:4 },
  'radar-univ':      { cat:'radar',      filePath: 'radar/universal-radar-plate.pdf',   accessLevel:3, downloadLevel:4 },
  'mazda-avm':       { cat:'mazda',      filePath: 'mazda/mazda-avm-fsc.pdf',           accessLevel:3, downloadLevel:4 },
  'mitsubishi-lka':  { cat:'mitsubishi', filePath: 'mitsubishi/mitsubishi-lka-avm.pdf', accessLevel:3, downloadLevel:4 },
  'byd-avm':         { cat:'chineses',   filePath: 'chineses/byd-avm-pattern.pdf',      accessLevel:3, downloadLevel:4 },
  'mg-chery':        { cat:'chineses',   filePath: 'chineses/mg-chery-avm.pdf',         accessLevel:3, downloadLevel:4 },
};

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
    if (!contentId) return json({ error: 'contentId obrigatório.' }, 400);

    const content = CONTENT_MAP[contentId];
    if (!content) return json({ error: 'Conteúdo não encontrado.' }, 404);
    if (!content.filePath) return json({ error: 'Arquivo ainda não disponível.' }, 404);

    const role = userData.role;
    const isStaff = ['admin', 'gestor', 'superadmin'].includes(role);
    const hasPermission = isStaff || (userData.permissions || []).includes(content.cat);

    if (!hasPermission) return json({ error: 'Sem permissão para este conteúdo.' }, 403);

    // 3a. Nível do usuário (plano) — staff (nível 4) sempre passa, como no cliente.
    const isStaffLevel = isStaff;
    const userLevel = isStaffLevel ? 4 : { free:1, modulo:2, pro:3, premium:4 }[userData.plan] || 1;

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
    console.error('[get-download-url] unhandled:', e);
    return json({ error: 'Erro interno do servidor.' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
