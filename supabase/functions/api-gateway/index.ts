// ADAS PRO — Edge Function: api-gateway
// API pública — roteamento, validação de API key, rate limiting
// Deploy: supabase functions deploy api-gateway
//
// A lógica testável está em handler.ts.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import {
  CONTENT_MAP, CATEGORIES, MFA_REQUIRED_ACTIONS, RATE_LIMIT, RATE_WINDOW_MS,
  bodyTooLarge, checkRateLimit, evaluateAccess, isValidContentId, paginate,
  readJsonBody,
  requireMfa, sha256Hex, validateApiKey, validateJwt,
  type ApiKeyDeps, type GatewayDeps, type JwtDeps,
} from './handler.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function adminClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY);
}

let rateLimitAdmin: ReturnType<typeof createClient> | null = null;
function getRateLimitAdmin() {
  if (!rateLimitAdmin) rateLimitAdmin = createClient(SUPABASE_URL, SERVICE_KEY);
  return rateLimitAdmin;
}

const rateLimitDeps: GatewayDeps = {
  incrementRateLimit: async (bucket, window, limit, windowMs) => {
    const { data, error } = await getRateLimitAdmin().rpc('increment_rate_limit', {
      p_bucket: bucket, p_window: window, p_limit: limit, p_window_ms: windowMs,
    });
    if (error) { console.error('rate_limits rpc error:', error.message); return null; }
    return typeof data === 'number' ? data : null;
  },
};

const apiKeyDeps: ApiKeyDeps = {
  lookupKey: async (hash) => {
    const { data } = await adminClient()
      .from('api_keys').select('user_id, plan, active')
      .eq('key_hash', hash).eq('active', true).maybeSingle();
    return data as { user_id: string | null; plan: string; active: boolean } | null;
  },
  loadOwner: async (userId) => {
    const { data } = await adminClient()
      .from('users').select('id, role, status, permissions, plan')
      .eq('id', userId).maybeSingle();
    return data as { id: string; role: string; status: string; permissions: string[]; plan: string } | null;
  },
  sha256: sha256Hex,
};

function json(data: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

function corsHeaders(origin: string | null) {
  // SECURITY: `origin` é lido do request corrente — nunca de estado global
  // compartilhado, que sob concorrência poderia devolver o origin de outro
  // request (corrida de CORS).
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED.includes(origin) ? origin : 'https://adaspro.com.br',
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-api-key',
    'Cache-Control': 'private, no-store',
  };
}
const ALLOWED = ['https://adaspro.com.br'];

const CERTIFICATIONS = [
  { id:'cert-level-1', name:'ADAS Fundamentals', level:1, hours:8, modules:4, description:'Fundamentos de sistemas ADAS, componentes, funcionamento e terminologia.' },
  { id:'cert-level-2', name:'ADAS Calibration Specialist', level:2, hours:16, modules:5, description:'Especialização em calibração de câmeras e radares ADAS.' },
  { id:'cert-level-3', name:'ADAS Advanced Diagnostics', level:3, hours:24, modules:6, description:'Diagnóstico avançado, códigos de falha e procedimentos de reparo.' },
];

serve(async (req) => {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json({ ok:false, error:'Method not allowed.', code:'METHOD_NOT_ALLOWED' }, 405, origin);
  }
  // Atalho via header (barato); o teto real é aplicado na leitura do stream.
  if (bodyTooLarge(req)) {
    return json({ ok:false, error:'Payload muito grande.', code:'PAYLOAD_TOO_LARGE' }, 413, origin);
  }

  try {
    /* ─── 1. Rate limit (credencial + IP) ─── */
    const clientIp = req.headers.get('x-real-ip')
      || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
      || 'unknown';
    const cred = req.headers.get('x-api-key') || req.headers.get('authorization') || 'anonymous';

    let allowed = true, remaining = RATE_LIMIT, resetAt = 0;
    for (const bucket of [`cred:${cred}`, `ip:${clientIp}`]) {
      const r = await checkRateLimit(bucket, rateLimitDeps);
      if (!r.allowed) allowed = false;
      remaining = Math.min(remaining, r.remaining);
      resetAt = Math.max(resetAt, r.resetAt);
    }
    if (!allowed) {
      return json({ ok:false, error:'Rate limit excedido. Tente novamente em breve.', code:'RATE_LIMITED' }, 429, origin);
    }
    const rateHeaders = {
      'X-RateLimit-Limit': String(RATE_LIMIT),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(Math.floor(resetAt / 1000)),
    };

    /* ─── 2. Autenticação ─── */
    const apiKey = req.headers.get('x-api-key');
    const authHeader = req.headers.get('authorization');

    let userId: string;
    let userRole = '';
    let viaApiKey = false;
    let owner: { role:string; status:string; permissions:string[]; plan:string } | null = null;

    if (apiKey) {
      const keyResult = await validateApiKey(apiKey, apiKeyDeps);
      if (!keyResult.valid) {
        return json({ ok:false, error:'API Key inválida, inativa ou revogada.', code:'INVALID_API_KEY' }, 401, origin);
      }
      userId = keyResult.userId;
      viaApiKey = true;
      owner = await apiKeyDeps.loadOwner(userId);
    } else if (authHeader) {
      const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: authData, error: authErr } = await supabaseUser.auth.getUser();
      if (authErr || !authData?.user) {
        return json({ ok:false, error:'Token JWT inválido ou sessão expirada.', code:'INVALID_TOKEN' }, 401, origin);
      }
      const uid = authData.user.id;
      const jwtDeps: JwtDeps = {
        verifyToken: async () => true,
        loadUser: async (id) => {
          const { data } = await adminClient().from('users').select('role, status').eq('id', id).maybeSingle();
          return data as { role:string; status:string } | null;
        },
      };
      const jwtResult = await validateJwt(authHeader, jwtDeps, uid);
      if (!jwtResult.valid) {
        return json({ ok:false, error:'Conta inativa ou pendente de aprovação.', code:'INACTIVE' }, 403, origin);
      }
      userId = jwtResult.userId;
      userRole = jwtResult.role;
      const { data: full } = await adminClient()
        .from('users').select('role, status, permissions, plan').eq('id', userId).maybeSingle();
      owner = full as typeof owner;
    } else {
      return json({ ok:false, error:'Autenticação obrigatória. Use X-API-Key ou Authorization Bearer.', code:'NO_AUTH' }, 401, origin);
    }

    if (!userId) {
      return json({ ok:false, error:'Identidade não resolvida.', code:'NO_IDENTITY' }, 403, origin);
    }
    if (owner && owner.status !== 'active') {
      return json({ ok:false, error:'Conta inativa ou pendente de aprovação.', code:'INACTIVE' }, 403, origin);
    }

    /* ─── 3. Parse da action ─── */
    const url = new URL(req.url);
    let action = url.searchParams.get('action') || '';

    let body: Record<string, unknown> = {};
    if (req.method === 'POST') {
      // Leitura com teto real no stream — `req.json()` sem limite permitiria
      // DoS de memória via body grande enviado em chunked (sem content-length).
      const parsed = await readJsonBody(req);
      if (!parsed.ok) {
        return json({ ok:false, error:'Payload muito grande.', code:'PAYLOAD_TOO_LARGE' }, 413, origin);
      }
      body = parsed.data;
      if (typeof body.action === 'string') action = body.action;
      for (const [k, v] of Object.entries(body)) {
        if (k !== 'action' && !Array.isArray(v)) url.searchParams.set(k, String(v));
      }
    }

    /* ─── 4. MFA (aal2) para ações sensíveis ─── */
    // SECURITY: sem este gate, uma senha vazada (sessão aal1, MFA não
    // concluído) bastava para assinar downloads e ler dados do usuário —
    // anulando o controle de MFA que get-download-url/notify/approve-user exigem.
    // Chave de API não tem sessão de usuário, logo não passa por aqui.
    if (!viaApiKey && MFA_REQUIRED_ACTIONS.has(action) && authHeader) {
      const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const aal = await supabaseUser.auth.mfa.getAuthenticatorAssuranceLevel();
      const mfa = await requireMfa(aal);
      if (!mfa.ok) return json({ ok:false, error: mfa.msg, code:'MFA_REQUIRED' }, 403, origin);
    }

    /* ─── 5. Rotear ─── */
    switch (action) {
      case 'list_content': {
        const category = url.searchParams.get('category');
        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1') || 1);
        const perPage = Math.min(Math.max(1, parseInt(url.searchParams.get('per_page') || '20') || 20), 100);

        // SECURITY: filtrar por permissão/plano. Antes devolvia o catálogo
        // completo (incl. accessLevel/downloadLevel) a qualquer autenticado,
        // expondo o catálogo pago a contas free.
        const isStaff = !!owner && ['admin','gestor','superadmin'].includes(owner.role);
        const perms = owner?.permissions || [];
        const visible = Object.entries(CONTENT_MAP)
          .map(([id, c]) => ({ id, ...c }))
          .filter(i => isStaff || (perms.includes(i.cat) && (i.accessLevel || 1) <= (isStaff ? 4 : planLevel(owner?.plan))));
        const items = category ? visible.filter(i => i.cat === category) : visible;

        return json({ ok:true, ...paginate(items, page, perPage), ...rateHeaders }, 200, origin);
      }

      case 'get_content': {
        const id = url.searchParams.get('id');
        if (!isValidContentId(id)) {
          return json({ ok:false, error:'Parâmetro "id" inválido.', code:'MISSING_ID' }, 400, origin);
        }
        const item = CONTENT_MAP[id];
        if (!item) return json({ ok:false, error:'Material não encontrado.', code:'NOT_FOUND' }, 404, origin);

        const decision = evaluateAccess(item, owner);
        if (!decision.allowed) {
          return json({ ok:false, error:'Sem permissão para este material.', code: decision.code }, 403, origin);
        }
        return json({ ok:true, data:{ id, ...item }, ...rateHeaders }, 200, origin);
      }

      case 'get_download_url': {
        const id = url.searchParams.get('contentId') || url.searchParams.get('id');
        if (!isValidContentId(id)) {
          return json({ ok:false, error:'Parâmetro "contentId" inválido.', code:'MISSING_ID' }, 400, origin);
        }
        const item = CONTENT_MAP[id];
        if (!item) return json({ ok:false, error:'Material não encontrado.', code:'NOT_FOUND' }, 404, origin);

        const { data: settingsData } = await adminClient()
          .from('settings').select('value').eq('key', 'app').maybeSingle();
        const mod = settingsData?.value?.moduleAccess?.[item.cat] ?? null;

        const decision = evaluateAccess(item, owner, { needFile: true, moduleAccess: mod });
        if (!decision.allowed) {
          const msgs: Record<string, string> = {
            NO_PERMISSION: 'Sem permissão para este material.',
            PLAN_LEVEL: 'Seu plano não permite visualizar este material.',
            INSUFFICIENT_ACCESS: 'Seu plano não permite baixar este material.',
            FILE_UNAVAILABLE: 'Arquivo ainda não disponível.',
          };
          const status = decision.code === 'FILE_UNAVAILABLE' ? 404 : 403;
          return json({ ok:false, error: msgs[decision.code], code: decision.code }, status, origin);
        }

        // Usa o filePath do catálogo — nunca constrói de cat/id (404 em tudo).
        const { data: signedUrl, error } = await adminClient().storage
          .from('materiais').createSignedUrl(item.filePath!, 3600);
        if (error || !signedUrl) {
          return json({ ok:false, error:'Erro ao gerar URL de download.', code:'STORAGE_ERROR' }, 500, origin);
        }

        // Auditoria (fail-safe: apenas loga, não bloqueia o download)
        const { error: logErr } = await adminClient().from('audit_logs').insert({
          action:'download_content', actor_id:userId, target_id:id,
          details:{ cat:item.cat, filePath:item.filePath },
          created_at: new Date().toISOString(),
        });
        if (logErr) console.error('[api-gateway] audit_logs falhou:', logErr.message);

        return json({ ok:true, data:{ url:signedUrl.signedUrl, expiresAt:new Date(Date.now()+3600000).toISOString(), fileName:`${id}.pdf` }, ...rateHeaders }, 200, origin);
      }

      case 'list_categories':
        return json({ ok:true, data:CATEGORIES, ...rateHeaders }, 200, origin);

      case 'get_user': {
        const { data: userData } = await adminClient()
          .from('users').select('id, name, email, role, plan, status, permissions').eq('id', userId).single();
        if (!userData) return json({ ok:false, error:'Usuário não encontrado.', code:'USER_NOT_FOUND' }, 404, origin);
        return json({ ok:true, data:userData, ...rateHeaders }, 200, origin);
      }

      case 'update_progress': {
        const contentId = url.searchParams.get('contentId');
        if (!isValidContentId(contentId)) {
          return json({ ok:false, error:'Parâmetro "contentId" inválido.', code:'MISSING_ID' }, 400, origin);
        }
        // SECURITY: antes aceitava qualquer string e gravava em user_progress.
        if (!CONTENT_MAP[contentId]) {
          return json({ ok:false, error:'Material não encontrado.', code:'NOT_FOUND' }, 404, origin);
        }
        const progress = Math.min(Math.max(parseInt(url.searchParams.get('progress') || '0') || 0, 0), 100);
        const completed = url.searchParams.get('completed') === 'true';

        const { error } = await adminClient().from('user_progress').upsert({
          user_id: userId, content_id: contentId, progress, completed,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,content_id' });
        if (error) return json({ ok:false, error:'Erro ao salvar progresso.', code:'DB_ERROR' }, 500, origin);
        return json({ ok:true, data:{ contentId, progress, completed }, ...rateHeaders }, 200, origin);
      }

      case 'list_bulletins': {
        const type = url.searchParams.get('type');
        let query = adminClient().from('bulletins').select('*').eq('status','published').order('created_at',{ ascending:false });
        if (type) query = query.eq('type', type);
        const { data, error } = await query;
        if (error) return json({ ok:false, error:'Erro ao buscar boletins.', code:'DB_ERROR' }, 500, origin);
        return json({ ok:true, data:data||[], ...rateHeaders }, 200, origin);
      }

      case 'list_articles': {
        const { data, error } = await adminClient().from('articles').select('*')
          .eq('status','published').order('created_at',{ ascending:false });
        if (error) return json({ ok:false, error:'Erro ao buscar artigos.', code:'DB_ERROR' }, 500, origin);
        return json({ ok:true, data:data||[], ...rateHeaders }, 200, origin);
      }

      case 'list_certifications':
        return json({ ok:true, data:CERTIFICATIONS, ...rateHeaders }, 200, origin);

      case 'submit_quiz': {
        const certId = url.searchParams.get('certificationId');
        const moduleId = url.searchParams.get('moduleId');
        if (!certId || !moduleId) {
          return json({ ok:false, error:'Parâmetros "certificationId" e "moduleId" obrigatórios.', code:'MISSING_PARAMS' }, 400, origin);
        }

        // SECURITY: sem gabarito não calcula resultado — evita que o cliente
        // controle o score. O gabarito nunca é devolvido na resposta.
        const { data: quizQuestions } = await adminClient().from('quiz_questions')
          .select('id, correct_answer').eq('module_id', moduleId).eq('certification_id', certId);
        if (!quizQuestions || quizQuestions.length === 0) {
          return json({ ok:false, error:'Quiz indisponível para certificação neste momento.', code:'QUIZ_UNAVAILABLE' }, 409, origin);
        }

        const rawAnswers = body.answers ?? url.searchParams.get('answers');
        let answersList: unknown[] = [];
        if (Array.isArray(rawAnswers)) answersList = rawAnswers as unknown[];
        else if (typeof rawAnswers === 'string') {
          try { const p = JSON.parse(rawAnswers); if (Array.isArray(p)) answersList = p; } catch { /* score 0 */ }
        }
        const answerMap = new Map<string, string>(
          answersList.map((a: any) => [String(a?.questionId ?? a?.id), String(a?.givenAnswer ?? a?.answer ?? a?.selected)])
        );

        const correctCount = quizQuestions.filter((q: any) =>
          answerMap.get(String(q.id)) === String(q.correct_answer)
        ).length;
        const score = Math.round((correctCount / quizQuestions.length) * 100);
        const passed = score >= 70;

        await adminClient().from('quiz_results').insert({
          user_id: userId, certification_id: certId, module_id: moduleId,
          score, passed, completed_at: new Date().toISOString(),
        });

        return json({ ok:true, data:{
          certificationId:certId, moduleId, score, passed,
          correctCount, totalCount:quizQuestions.length, completedAt:new Date().toISOString(),
        }, ...rateHeaders }, 200, origin);
      }

      default:
        return json({ ok:false, error:`Ação desconhecida: "${action}". Consulte /api-docs para endpoints disponíveis.`, code:'UNKNOWN_ACTION' }, 400, origin);
    }
  } catch (err) {
    console.error('API Gateway error:', err);
    return json({ ok:false, error:'Erro interno do servidor.', code:'INTERNAL_ERROR' }, 500, origin);
  }
});

function planLevel(plan: string | undefined): number {
  return ({ free:1, modulo:2, pro:3, premium:4 } as Record<string, number>)[plan || 'free'] || 1;
}

// Evita warning de import não usado quando RATE_WINDOW_MS só é referenciado aqui.
void RATE_WINDOW_MS;
