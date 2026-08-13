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

// Mapa de conteúdo: contentId → { cat, filePath }
// Mantido server-side para evitar que o cliente forje metadados
const CONTENT_MAP: Record<string, { cat: string; filePath: string | null }> = {
  'honda-lkas':      { cat:'honda',      filePath: 'honda/honda-lkas-calibration.pdf' },
  'honda-avm':       { cat:'honda',      filePath: 'honda/honda-avm-360.pdf' },
  'honda-acc':       { cat:'honda',      filePath: null },
  'toyota-ldw':      { cat:'toyota',     filePath: 'toyota/toyota-ldw-120.pdf' },
  'toyota-180':      { cat:'toyota',     filePath: 'toyota/toyota-lda-180.pdf' },
  'toyota-avm':      { cat:'toyota',     filePath: 'toyota/toyota-avm.pdf' },
  'nissan-lka':      { cat:'nissan',     filePath: 'nissan/nissan-lka-tipo1.pdf' },
  'nissan-propilot': { cat:'nissan',     filePath: 'nissan/nissan-propilot.pdf' },
  'nissan-radar':    { cat:'nissan',     filePath: null },
  'subaru-type1':    { cat:'subaru',     filePath: 'subaru/subaru-eyesight-tipo1.pdf' },
  'subaru-type2':    { cat:'subaru',     filePath: 'subaru/subaru-eyesight-tipo2.pdf' },
  'hyundai-avm':     { cat:'hyundai',    filePath: 'hyundai/hyundai-avm.pdf' },
  'hyundai-radar':   { cat:'hyundai',    filePath: 'hyundai/hyundai-radar-acc.pdf' },
  'audi-lidar':      { cat:'vag',        filePath: 'vag/audi-lidar-vas6430.pdf' },
  'vag-avm':         { cat:'vag',        filePath: 'vag/vag-avm.pdf' },
  'mercedes-night':  { cat:'mercedes',   filePath: 'mercedes/mercedes-night-vision.pdf' },
  'mercedes-rcw':    { cat:'mercedes',   filePath: 'mercedes/mercedes-rcw.pdf' },
  'ford-avm':        { cat:'ford',       filePath: 'ford/ford-avm-360.pdf' },
  'radar-univ':      { cat:'radar',      filePath: 'radar/universal-radar-plate.pdf' },
  'mazda-avm':       { cat:'mazda',      filePath: 'mazda/mazda-avm-fsc.pdf' },
  'mitsubishi-lka':  { cat:'mitsubishi', filePath: 'mitsubishi/mitsubishi-lka-avm.pdf' },
  'byd-avm':         { cat:'chineses',   filePath: 'chineses/byd-avm-pattern.pdf' },
  'mg-chery':        { cat:'chineses',   filePath: 'chineses/mg-chery-avm.pdf' },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

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
      .select('role, status, permissions')
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
    return json({ error: e.message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
