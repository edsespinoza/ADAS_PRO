// ADAS PRO — Edge Function: api-gateway
// API pública — roteamento, validação de API key, rate limiting
// Deploy: supabase functions deploy api-gateway

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-api-key',
};

/* ─── Rate Limiting (in-memory) ─── */
const RATE_LIMIT = 100;
const RATE_WINDOW = 60_000; // 1 minuto
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1, resetAt: now + RATE_WINDOW };
  }

  if (entry.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT - entry.count, resetAt: entry.resetAt };
}

/* ─── API Key validation ─── */
const VALID_API_KEYS = new Map<string, { userId: string; plan: string; active: boolean }>();

async function validateApiKey(apiKey: string): Promise<{ valid: boolean; userId?: string; plan?: string }> {
  if (!apiKey || !apiKey.startsWith('adas_live_')) return { valid: false };

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data } = await supabase
    .from('api_keys')
    .select('user_id, plan, active')
    .eq('key_hash', await hashKey(apiKey))
    .eq('active', true)
    .single();

  if (!data) return { valid: false };
  return { valid: true, userId: data.user_id, plan: data.plan };
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ─── JWT validation ─── */
async function validateJwt(authHeader: string): Promise<{ valid: boolean; userId?: string; role?: string }> {
  if (!authHeader?.startsWith('Bearer ')) return { valid: false };

  const token = authHeader.slice(7);
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { valid: false };

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: userData } = await supabaseAdmin
    .from('users').select('role, status').eq('id', user.id).single();

  if (userData?.status !== 'active') return { valid: false };
  return { valid: true, userId: user.id, role: userData?.role };
}

/* ─── Content data ─── */
const CATEGORIES = [
  { id:'honda', label:'Honda & Acura', icon:'🔵' },
  { id:'toyota', label:'Toyota & Lexus', icon:'🔴' },
  { id:'nissan', label:'Nissan & Infiniti', icon:'🟡' },
  { id:'subaru', label:'Subaru EyeSight', icon:'🟢' },
  { id:'hyundai', label:'Hyundai & Kia', icon:'🔷' },
  { id:'vag', label:'VAG (Audi/VW/Seat)', icon:'🟣' },
  { id:'mercedes', label:'Mercedes-Benz', icon:'⭕' },
  { id:'ford', label:'Ford & Lincoln', icon:'🔸' },
  { id:'radar', label:'Radar Universal', icon:'📡' },
  { id:'mazda', label:'Mazda AVM 360°', icon:'🔶' },
  { id:'mitsubishi', label:'Mitsubishi', icon:'🔹' },
  { id:'chineses', label:'BYD / Chery / MG', icon:'🇨🇳' },
];

const CONTENT_MAP: Record<string, { cat: string; title: string; desc: string; accessLevel: number; downloadLevel: number; fileSize: string; pages: number; version: string; updatedAt: string; models: string[] }> = {
  'honda-lkas':      { cat:'honda', title:'Honda LKAS Calibration', desc:'Guia completo de calibração do sistema LKAS para Honda e Acura.', accessLevel:2, downloadLevel:3, fileSize:'2.4 MB', pages:18, version:'v3.1', updatedAt:'Abr/2026', models:['Civic','CR-V','HR-V','Accord'] },
  'honda-avm':       { cat:'honda', title:'Honda AVM 360°', desc:'Padrão de calibração AVM para câmeras de visão panorâmica Honda.', accessLevel:2, downloadLevel:3, fileSize:'1.8 MB', pages:12, version:'v2.4', updatedAt:'Mar/2026', models:['CR-V 2017+','Odyssey','Pilot'] },
  'toyota-ldw':      { cat:'toyota', title:'Toyota LDW/LDA — Target 120°', desc:'Sistema Lane Departure Warning para veículos Toyota/Lexus.', accessLevel:2, downloadLevel:3, fileSize:'3.1 MB', pages:22, version:'v4.2', updatedAt:'Abr/2026', models:['Corolla','Camry','RAV4','Hilux'] },
  'toyota-180':      { cat:'toyota', title:'Toyota LDA — Target 180°', desc:'Target de calibração 180° para câmeras frontais Toyota/Lexus 2019+.', accessLevel:2, downloadLevel:3, fileSize:'2.9 MB', pages:20, version:'v3.8', updatedAt:'Mar/2026', models:['RAV4 2019+','Camry 2019+'] },
  'nissan-lka':      { cat:'nissan', title:'Nissan/Infiniti LKA — Tipo 1', desc:'348+ modelos suportados. Cobertura 2013–2024.', accessLevel:2, downloadLevel:3, fileSize:'4.7 MB', pages:28, version:'v5.1', updatedAt:'Abr/2026', models:['Sentra','Frontier','X-Trail'] },
  'subaru-type1':    { cat:'subaru', title:'Subaru EyeSight — Tipo 1', desc:'Calibração EyeSight geração 1 e 2. 350+ entradas.', accessLevel:3, downloadLevel:3, fileSize:'5.2 MB', pages:32, version:'v4.5', updatedAt:'Abr/2026', models:['Forester','Outback','Legacy'] },
  'hyundai-avm':     { cat:'hyundai', title:'Hyundai & Kia AVM 360°', desc:'Padrões de calibração AVM. 4 câmeras.', accessLevel:3, downloadLevel:3, fileSize:'2.6 MB', pages:18, version:'v3.3', updatedAt:'Mar/2026', models:['Tucson','Santa Fe','Sorento'] },
  'audi-lidar':      { cat:'vag', title:'Audi LIDAR ACC — VAS6430-12', desc:'Target proprietário VAS6430-12 para calibração LIDAR Audi.', accessLevel:3, downloadLevel:4, fileSize:'6.1 MB', pages:38, version:'v5.0', updatedAt:'Abr/2026', models:['A4 2016+','A6 2019+','Q5','Q7'] },
  'ford-avm':        { cat:'ford', title:'Ford AVM 360°', desc:'Target LH e RH para calibração AVM Ford.', accessLevel:3, downloadLevel:4, fileSize:'4.2 MB', pages:28, version:'v3.7', updatedAt:'Mar/2026', models:['Ranger 2022+','Bronco Sport','Explorer'] },
  'radar-univ':      { cat:'radar', title:'Universal Radar Plate — ACC', desc:'Solução universal de target para ACC/SCC/AEB.', accessLevel:3, downloadLevel:4, fileSize:'1.9 MB', pages:12, version:'v2.1', updatedAt:'Abr/2026', models:['Genesis','Hyundai','Kia','Nissan'] },
  'mazda-avm':       { cat:'mazda', title:'Mazda AVM 360° + FSC', desc:'Front Side Camera target, calibração multi-ângulo.', accessLevel:3, downloadLevel:4, fileSize:'3.7 MB', pages:24, version:'v2.6', updatedAt:'Mar/2026', models:['CX-5 2021+','CX-50','CX-90'] },
  'mitsubishi-lka':  { cat:'mitsubishi', title:'Mitsubishi LKA + AVM', desc:'Eclipse Cross, Outlander, EK-models.', accessLevel:3, downloadLevel:4, fileSize:'2.5 MB', pages:18, version:'v2.3', updatedAt:'Fev/2026', models:['Eclipse Cross 2018+','Outlander 2022+'] },
  'byd-avm':         { cat:'chineses', title:'BYD AVM — 4 Variantes', desc:'Padrão de calibração AVM para veículos BYD.', accessLevel:3, downloadLevel:4, fileSize:'2.3 MB', pages:16, version:'v1.8', updatedAt:'Abr/2026', models:['BYD Dolphin','BYD Seal','BYD Atto 3'] },
};

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function paginate<T>(items: T[], page: number, perPage: number) {
  const start = (page - 1) * perPage;
  return {
    data: items.slice(start, start + perPage),
    total: items.length,
    page,
    per_page: perPage,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // 1. Rate limit
    const rateKey = req.headers.get('x-api-key') || req.headers.get('authorization') || 'anonymous';
    const rateLimit = checkRateLimit(rateKey);
    const rateHeaders = {
      'X-RateLimit-Limit': String(RATE_LIMIT),
      'X-RateLimit-Remaining': String(rateLimit.remaining),
      'X-RateLimit-Reset': String(Math.floor(rateLimit.resetAt / 1000)),
    };

    if (!rateLimit.allowed) {
      return json({ ok: false, error: 'Rate limit excedido. Tente novamente em breve.', code: 'RATE_LIMITED' }, 429);
    }

    // 2. Authenticate
    const apiKey = req.headers.get('x-api-key');
    const authHeader = req.headers.get('authorization');

    let userId: string | undefined;
    let userRole: string | undefined;

    if (apiKey) {
      const keyResult = await validateApiKey(apiKey);
      if (!keyResult.valid) {
        return json({ ok: false, error: 'API Key inválida ou inativa.', code: 'INVALID_API_KEY' }, 401);
      }
      userId = keyResult.userId;
    } else if (authHeader) {
      const jwtResult = await validateJwt(authHeader);
      if (!jwtResult.valid) {
        return json({ ok: false, error: 'Token JWT inválido ou sessão expirada.', code: 'INVALID_TOKEN' }, 401);
      }
      userId = jwtResult.userId;
      userRole = jwtResult.role;
    } else {
      return json({ ok: false, error: 'Autenticação obrigatória. Use X-API-Key ou Authorization Bearer.', code: 'NO_AUTH' }, 401);
    }

    // 3. Parse action
    const url = new URL(req.url);
    let action = url.searchParams.get('action') || '';

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      action = body.action || action;
      // Merge body into params for handlers
      for (const [k, v] of Object.entries(body)) {
        if (k !== 'action') url.searchParams.set(k, String(v));
      }
    }

    // 4. Route
    switch (action) {
      case 'list_content': {
        const category = url.searchParams.get('category');
        const page = parseInt(url.searchParams.get('page') || '1');
        const perPage = Math.min(parseInt(url.searchParams.get('per_page') || '20'), 100);

        let items = Object.entries(CONTENT_MAP).map(([id, c]) => ({ id, ...c }));
        if (category) items = items.filter(i => i.cat === category);

        return json({ ok: true, ...paginate(items, page, perPage), ...rateHeaders });
      }

      case 'get_content': {
        const id = url.searchParams.get('id');
        if (!id) return json({ ok: false, error: 'Parâmetro "id" obrigatório.', code: 'MISSING_ID' }, 400);

        const item = CONTENT_MAP[id];
        if (!item) return json({ ok: false, error: 'Material não encontrado.', code: 'NOT_FOUND' }, 404);

        return json({ ok: true, data: { id, ...item }, ...rateHeaders });
      }

      case 'get_download_url': {
        const id = url.searchParams.get('contentId') || url.searchParams.get('id');
        if (!id) return json({ ok: false, error: 'Parâmetro "contentId" obrigatório.', code: 'MISSING_ID' }, 400);

        const item = CONTENT_MAP[id];
        if (!item) return json({ ok: false, error: 'Material não encontrado.', code: 'NOT_FOUND' }, 404);

        // Check user permissions
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const { data: userData } = await supabaseAdmin
          .from('users').select('role, permissions, plan').eq('id', userId).single();

        if (!userData) return json({ ok: false, error: 'Usuário não encontrado.', code: 'USER_NOT_FOUND' }, 404);

        const planLevels: Record<string, number> = { free: 1, modulo: 2, pro: 3, premium: 4 };
        const userLevel = planLevels[userData.plan] || 1;

        if (userLevel < item.downloadLevel) {
          return json({ ok: false, error: 'Nível de acesso insuficiente para este material.', code: 'INSUFFICIENT_ACCESS' }, 403);
        }

        // Generate signed URL
        const { data: signedUrl, error } = await supabaseAdmin.storage
          .from('materiais')
          .createSignedUrl(`${item.cat}/${id}.pdf`, 3600);

        if (error) return json({ ok: false, error: 'Erro ao gerar URL de download.', code: 'STORAGE_ERROR' }, 500);

        return json({
          ok: true,
          data: { url: signedUrl.signedUrl, expiresAt: new Date(Date.now() + 3600000).toISOString(), fileName: `${id}.pdf` },
          ...rateHeaders,
        });
      }

      case 'list_categories': {
        return json({ ok: true, data: CATEGORIES, ...rateHeaders });
      }

      case 'get_user': {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const { data: userData } = await supabaseAdmin
          .from('users').select('id, name, email, role, plan, status, permissions').eq('id', userId).single();

        if (!userData) return json({ ok: false, error: 'Usuário não encontrado.', code: 'USER_NOT_FOUND' }, 404);
        return json({ ok: true, data: userData, ...rateHeaders });
      }

      case 'update_progress': {
        const contentId = url.searchParams.get('contentId');
        const progress = parseInt(url.searchParams.get('progress') || '0');
        const completed = url.searchParams.get('completed') === 'true';

        if (!contentId) return json({ ok: false, error: 'Parâmetro "contentId" obrigatório.', code: 'MISSING_ID' }, 400);

        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const { error } = await supabaseAdmin.from('user_progress').upsert({
          user_id: userId,
          content_id: contentId,
          progress: Math.min(Math.max(progress, 0), 100),
          completed,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,content_id' });

        if (error) return json({ ok: false, error: 'Erro ao salvar progresso.', code: 'DB_ERROR' }, 500);
        return json({ ok: true, data: { contentId, progress, completed }, ...rateHeaders });
      }

      case 'list_bulletins': {
        const type = url.searchParams.get('type');
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        let query = supabaseAdmin.from('bulletins').select('*').eq('status', 'published').order('created_at', { ascending: false });
        if (type) query = query.eq('type', type);

        const { data, error } = await query;
        if (error) return json({ ok: false, error: 'Erro ao buscar boletins.', code: 'DB_ERROR' }, 500);
        return json({ ok: true, data: data || [], ...rateHeaders });
      }

      case 'list_articles': {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        const { data, error } = await supabaseAdmin
          .from('articles').select('*').eq('status', 'published').order('created_at', { ascending: false });

        if (error) return json({ ok: false, error: 'Erro ao buscar artigos.', code: 'DB_ERROR' }, 500);
        return json({ ok: true, data: data || [], ...rateHeaders });
      }

      case 'list_certifications': {
        const certs = [
          { id:'cert-level-1', name:'ADAS Fundamentals', level:1, hours:8, modules:4, description:'Fundamentos de sistemas ADAS, componentes, funcionamento e terminologia.' },
          { id:'cert-level-2', name:'ADAS Calibration Specialist', level:2, hours:16, modules:5, description:'Especialização em calibração de câmeras e radares ADAS.' },
          { id:'cert-level-3', name:'ADAS Advanced Diagnostics', level:3, hours:24, modules:6, description:'Diagnóstico avançado, códigos de falha e procedimentos de reparo.' },
        ];
        return json({ ok: true, data: certs, ...rateHeaders });
      }

      case 'submit_quiz': {
        const certId = url.searchParams.get('certificationId');
        const moduleId = url.searchParams.get('moduleId');

        if (!certId || !moduleId) {
          return json({ ok: false, error: 'Parâmetros "certificationId" e "moduleId" obrigatórios.', code: 'MISSING_PARAMS' }, 400);
        }

        // Score calculation (simplified)
        const answersParam = url.searchParams.get('answers');
        let score = 0;
        let passed = false;

        if (answersParam) {
          try {
            const answers = JSON.parse(answersParam);
            score = Math.round((answers.filter((a: any) => a.correct).length / Math.max(answers.length, 1)) * 100);
            passed = score >= 70;
          } catch { /* no answers = start quiz */ }
        }

        // Save result
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        if (answersParam) {
          await supabaseAdmin.from('quiz_results').insert({
            user_id: userId,
            certification_id: certId,
            module_id: moduleId,
            score,
            passed,
            completed_at: new Date().toISOString(),
          });
        }

        return json({
          ok: true,
          data: {
            certificationId: certId,
            moduleId,
            score,
            passed,
            correctCount: Math.round(score / 5),
            totalCount: 20,
            completedAt: new Date().toISOString(),
          },
          ...rateHeaders,
        });
      }

      default:
        return json({ ok: false, error: `Ação desconhecida: "${action}". Consulte /api-docs para endpoints disponíveis.`, code: 'UNKNOWN_ACTION' }, 400);
    }

  } catch (err) {
    console.error('API Gateway error:', err);
    return json({ ok: false, error: 'Erro interno do servidor.', code: 'INTERNAL_ERROR' }, 500);
  }
});
