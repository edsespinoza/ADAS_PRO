// ADAS PRO — Edge Function: api-gateway — lógica
// Roteamento, validação de API key, rate limiting e autorização de conteúdo.
// A entrada (serve/createClient/Deno.env) fica em index.ts; esta lógica é
// testável sem importar módulos remotos nem o runtime Deno.

import { CONTENT_MAP as CONTENT_CATALOG, type ContentEntry } from '../_shared/content-map.ts';

const ALLOWED_ORIGINS = ['https://adaspro.com.br'];

function corsHeadersFor(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : 'https://adaspro.com.br',
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-api-key',
    'Cache-Control': 'private, no-store',
  };
}

/* ─── Rate Limiting (shared via rate_limits table) ─── */
export const RATE_LIMIT = 100;
export const RATE_WINDOW_MS = 60_000;

/** Payload máximo aceito no body (evita DoS de memória via req.json()). */
const MAX_BODY_BYTES = 32 * 1024;

const STAFF_ROLES = ['admin', 'gestor', 'superadmin'];

export function windowStart(nowMs: number): string {
  return new Date(Math.floor(nowMs / RATE_WINDOW_MS) * RATE_WINDOW_MS).toISOString();
}

export interface RateLimitResult { allowed: boolean; remaining: number; resetAt: number }

export interface GatewayDeps {
  /** Incrementa o contador da janela e retorna a contagem pós-incremento. */
  incrementRateLimit(bucket: string, window: string, limit: number, windowMs: number): Promise<number | null>;
}

export async function checkRateLimit(
  key: string,
  deps: GatewayDeps,
  nowMs: number = Date.now()
): Promise<RateLimitResult> {
  const window = windowStart(nowMs);
  const resetAt = (Math.floor(nowMs / RATE_WINDOW_MS) + 1) * RATE_WINDOW_MS;
  try {
    const count = await deps.incrementRateLimit(key, window, RATE_LIMIT, RATE_WINDOW_MS);
    if (count === null) throw new Error('rpc returned null');
    return { allowed: count <= RATE_LIMIT, remaining: Math.max(RATE_LIMIT - count, 0), resetAt };
  } catch {
    // Fail-open: se o banco de rate limit falhar, não bloqueia o tráfego
    // público. Em produção isso é aceitável porque a autenticação e RLS já
    // protegem os endpoints; o rate limit é uma camada adicional.
    return { allowed: true, remaining: RATE_LIMIT, resetAt };
  }
}

/* ─── API Key validation ─── */
export interface ApiKeyOwner { id: string; role: string; status: string; permissions: string[]; plan: string }

export type ApiKeyResult =
  | { valid: false }
  | { valid: true; userId: string; plan: string };

export interface ApiKeyDeps {
  /** Resolve uma chave já hasheada para o dono; null se inexistente/inativa. */
  lookupKey(hash: string): Promise<{ user_id: string | null; plan: string; active: boolean } | null>;
  /** Carrega o dono da chave. null se não existir mais em public.users. */
  loadOwner(userId: string): Promise<{ id: string; role: string; status: string; permissions: string[]; plan: string } | null>;
  sha256(input: string): Promise<string>;
}

export async function validateApiKey(apiKey: string, deps: ApiKeyDeps): Promise<ApiKeyResult> {
  if (!apiKey || !apiKey.startsWith('adas_live_')) return { valid: false };

  const data = await deps.lookupKey(await deps.sha256(apiKey));
  if (!data || !data.active) return { valid: false };

  // Chave órfã (user_id NULL — permitido pelo DDL) não tem identidade para
  // autorizar nada. Rejeitar aqui impede que endpoints assumam userId válido.
  if (!data.user_id) return { valid: false };

  // Paridade com validateJwt: um usuário bloqueado/pendente não pode mais
  // operar via API key, mesmo com a chave ainda marcada active. Sem isto, o
  // block() no approve-user não revoga o acessoEffective do usuário.
  const owner = await deps.loadOwner(data.user_id);
  if (!owner || owner.status !== 'active') return { valid: false };

  return { valid: true, userId: data.user_id, plan: data.plan };
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ─── JWT validation ─── */
export type JwtResult = { valid: false } | { valid: true; userId: string; role: string };

export interface JwtDeps {
  /** true se o token é válido e o usuário existe no Auth. */
  verifyToken(): Promise<boolean>;
  loadUser(userId: string): Promise<{ role: string; status: string } | null>;
}

export async function validateJwt(authHeader: string, deps: JwtDeps, userId: string): Promise<JwtResult> {
  if (!authHeader?.startsWith('Bearer ')) return { valid: false };
  if (!(await deps.verifyToken())) return { valid: false };

  const userData = await deps.loadUser(userId);
  if (!userData || userData.status !== 'active') return { valid: false };
  return { valid: true, userId, role: userData.role };
}

/**
 * MFA (aal2) obrigatório nas ações sensíveis.
 * `nextLevel === 'aal2'` significa que a conta TEM fator configurado; se a
 * sessão ainda é aal1, a 2ª etapa é obrigatória. Contas sem MFA têm nextLevel
 * aal1 e passam. Paridade com get-download-url / notify / approve-user.
 */
export async function requireMfa(
  aal: { data?: { nextLevel?: string | null; currentLevel?: string | null } | null; error?: unknown } | null
): Promise<{ ok: true } | { ok: false; msg: string }> {
  if (!aal || aal.error || !aal.data) {
    return { ok: false, msg: 'Não foi possível determinar o nível de autenticação.' };
  }
  if (aal.data.nextLevel === 'aal2' && aal.data.currentLevel !== 'aal2') {
    return { ok: false, msg: 'Autenticação em duas etapas (MFA) é obrigatória para esta ação.' };
  }
  return { ok: true };
}

/* ─── Content data ─── */
export const CATEGORIES = [
  { id:'honda', label:'Honda & Acura', icon:'🔵' },
  { id:'toyota', label:'Toyota & Lexus', icon:'🔴' },
  { id:'nissan', label:'Nissan & Infiniti', icon:'🟡' },
  { id:'subaru', label:'Subaru EyeSight', icon:'🟢' },
  { id:'hyundai', label:'Hyundai & Kia', icon:'🔷' },
  { id:'vag', label:'VAG (Audi/VW/Seat)', icon:'🟣' },
  { id:'mercedes', label:'Mercedes-Benz', icon:'⭕' },
  { id:'ford', label:'Ford & Lincoln', icon:'🟸' },
  { id:'radar', label:'Radar Universal', icon:'📡' },
  { id:'mazda', label:'Mazda AVM 360°', icon:'🟶' },
  { id:'mitsubishi', label:'Mitsubishi', icon:'🔹' },
  { id:'chineses', label:'BYD / Chery / MG', icon:'🇨🇳' },
];

/**
 * Metadados de EXIBIÇÃO (título, descrição, páginas, modelos). Não afetam
 * autorização — cat/filePath/accessLevel/downloadLevel vêm do catálogo
 * compartilhado, que é a única fonte de verdade.
 */
export interface ContentMeta {
  title: string; desc: string;
  fileSize: string; pages: number; version: string; updatedAt: string; models: string[];
}

const CONTENT_META: Record<string, ContentMeta> = {
  'honda-lkas':      { title:'Honda LKAS Calibration', desc:'Guia completo de calibração do sistema LKAS para Honda e Acura.', fileSize:'2.4 MB', pages:18, version:'v3.1', updatedAt:'Abr/2026', models:['Civic','CR-V','HR-V','Accord'] },
  'honda-avm':       { title:'Honda AVM 360°', desc:'Padrão de calibração AVM para câmeras de visão panorâmica Honda.', fileSize:'1.8 MB', pages:12, version:'v2.4', updatedAt:'Mar/2026', models:['CR-V 2017+','Odyssey','Pilot'] },
  'toyota-ldw':      { title:'Toyota LDW/LDA — Target 120°', desc:'Sistema Lane Departure Warning para veículos Toyota/Lexus.', fileSize:'3.1 MB', pages:22, version:'v4.2', updatedAt:'Abr/2026', models:['Corolla','Camry','RAV4','Hilux'] },
  'toyota-180':      { title:'Toyota LDA — Target 180°', desc:'Target de calibração 180° para câmeras frontais Toyota/Lexus 2019+.', fileSize:'2.9 MB', pages:20, version:'v3.8', updatedAt:'Mar/2026', models:['RAV4 2019+','Camry 2019+'] },
  'nissan-lka':      { title:'Nissan/Infiniti LKA — Tipo 1', desc:'348+ modelos suportados. Cobertura 2013–2024.', fileSize:'4.7 MB', pages:28, version:'v5.1', updatedAt:'Abr/2026', models:['Sentra','Frontier','X-Trail'] },
  'subaru-type1':    { title:'Subaru EyeSight — Tipo 1', desc:'Calibração EyeSight geração 1 e 2. 350+ entradas.', fileSize:'5.2 MB', pages:32, version:'v4.5', updatedAt:'Abr/2026', models:['Forester','Outback','Legacy'] },
  'hyundai-avm':     { title:'Hyundai & Kia AVM 360°', desc:'Padrões de calibração AVM. 4 câmeras.', fileSize:'2.6 MB', pages:18, version:'v3.3', updatedAt:'Mar/2026', models:['Tucson','Santa Fe','Sorento'] },
  'audi-lidar':      { title:'Audi LIDAR ACC — VAS6430-12', desc:'Target proprietário VAS6430-12 para calibração LIDAR Audi.', fileSize:'6.1 MB', pages:38, version:'v5.0', updatedAt:'Abr/2026', models:['A4 2016+','A6 2019+','Q5','Q7'] },
  'ford-avm':        { title:'Ford AVM 360°', desc:'Target LH e RH para calibração AVM Ford.', fileSize:'4.2 MB', pages:28, version:'v3.7', updatedAt:'Mar/2026', models:['Ranger 2022+','Bronco Sport','Explorer'] },
  'radar-univ':      { title:'Universal Radar Plate — ACC', desc:'Solução universal de target para ACC/SCC/AEB.', fileSize:'1.9 MB', pages:12, version:'v2.1', updatedAt:'Abr/2026', models:['Genesis','Hyundai','Kia','Nissan'] },
  'mazda-avm':       { title:'Mazda AVM 360° + FSC', desc:'Front Side Camera target, calibração multi-ângulo.', fileSize:'3.7 MB', pages:24, version:'v2.6', updatedAt:'Mar/2026', models:['CX-5 2021+','CX-50','CX-90'] },
  'mitsubishi-lka':  { title:'Mitsubishi LKA + AVM', desc:'Eclipse Cross, Outlander, EK-models.', fileSize:'2.5 MB', pages:18, version:'v2.3', updatedAt:'Fev/2026', models:['Eclipse Cross 2018+','Outlander 2022+'] },
  'byd-avm':         { title:'BYD AVM — 4 Variantes', desc:'Padrão de calibração AVM para veículos BYD.', fileSize:'2.3 MB', pages:16, version:'v1.8', updatedAt:'Abr/2026', models:['BYD Dolphin','BYD Seal','BYD Atto 3'] },
};

/**
 * Catálogo completo = fonte compartilhada (autoridade para autorização e
 * path de Storage) + metadados de exibição.
 *
 * O path NÃO é mais construído a partir de `${cat}/${id}.pdf`, que produzia
 * `honda/honda-lkas.pdf` para o arquivo real `honda/honda-lkas-calibration.pdf`
 * (todo download da API retornava 404).
 */
export interface ContentItem extends ContentEntry, Partial<ContentMeta> {}

export const CONTENT_MAP: Record<string, ContentItem> = Object.fromEntries(
  Object.entries(CONTENT_CATALOG).map(([id, entry]) => [id, { ...entry, ...(CONTENT_META[id] ?? {}) }]),
);

const PLAN_LEVELS: Record<string, number> = { free: 1, modulo: 2, pro: 3, premium: 4 };

/**
 * Decide se o usuário pode ver/baixar um item. Retorna o motivo da negativa
 * para que o chamador mapeie para o code HTTP correto.
 */
export type AccessDecision =
  | { allowed: true; isStaff: boolean; level: number }
  | { allowed: false; code: 'NO_PERMISSION' | 'PLAN_LEVEL' | 'INSUFFICIENT_ACCESS' | 'FILE_UNAVAILABLE' };

export function evaluateAccess(
  item: ContentItem,
  owner: { role: string; permissions: string[]; plan: string } | null,
  opts: { needFile?: boolean; moduleAccess?: { enabled?: boolean; minLevel?: number } | null } = {}
): AccessDecision {
  if (opts.needFile && !item.filePath) return { allowed: false, code: 'FILE_UNAVAILABLE' };

  const isStaff = !!owner && STAFF_ROLES.includes(owner.role);
  const hasPermission = isStaff || (owner?.permissions || []).includes(item.cat);
  if (!hasPermission) return { allowed: false, code: 'NO_PERMISSION' };

  const level = isStaff ? 4 : (PLAN_LEVELS[owner?.plan || 'free'] || 1);

  // Staff ignora limites de plano e de módulo — espelha get-download-url/auth.js
  if (!isStaff) {
    if (level < (item.accessLevel || 1)) return { allowed: false, code: 'PLAN_LEVEL' };
    if (opts.needFile && level < (item.downloadLevel || 2)) {
      return { allowed: false, code: 'INSUFFICIENT_ACCESS' };
    }
    if (opts.moduleAccess?.enabled === false) return { allowed: false, code: 'NO_PERMISSION' };
    if (opts.moduleAccess?.minLevel && level < opts.moduleAccess.minLevel) {
      return { allowed: false, code: 'NO_PERMISSION' };
    }
  }
  return { allowed: true, isStaff, level };
}

/** Ações que exigem sessão aal2 (MFA concluído). */
export const MFA_REQUIRED_ACTIONS = new Set(['get_download_url', 'get_user', 'update_progress', 'submit_quiz']);

/** Identidade resolvida do chamador. */
export interface Caller {
  userId: string;
  role: string;
  viaApiKey: boolean;
  owner: { role: string; status: string; permissions: string[]; plan: string } | null;
}

export function isValidContentId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && id.length <= 64 && /^[a-z0-9_-]+$/.test(id);
}

export function paginate<T>(items: T[], page: number, perPage: number) {
  const start = (page - 1) * perPage;
  return { data: items.slice(start, start + perPage), total: items.length, page, per_page: perPage };
}

/**
 * Checagem rápida via header — apenas um atalho. O header `content-length`
 * é controlado pelo cliente e pode ser omitido (Transfer-Encoding: chunked),
 * então ele NÃO é confiável sozinho. Use readJsonBody() para o limite real.
 */
export function bodyTooLarge(req: Request): boolean {
  const raw = req.headers.get('content-length');
  if (raw) {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n > MAX_BODY_BYTES) return true;
  }
  return false;
}

/**
 * Lê e parseia o body JSON com teto de bytes aplicado sobre o STREAM.
 * Confiar só no `content-length` deixa o limite burlável: um cliente que
 * envie chunked (ou omita o header) seria lido inteiro por `req.json()`.
 * Aqui o corpo é consumido incrementalmente e cortado assim que passa do teto.
 */
export async function readJsonBody(
  req: Request,
  maxBytes: number = MAX_BODY_BYTES,
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; tooLarge: true; data: Record<string, unknown> }> {
  if (bodyTooLarge(req)) return { ok: false, tooLarge: true, data: {} };
  if (!req.body) return { ok: true, data: {} };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return { ok: false, tooLarge: true, data: {} };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: true, data: {} };
  }

  const raw = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    raw.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const parsed = JSON.parse(new TextDecoder().decode(raw));
    // Só objetos são aceitos — arrays e primitivos não têm chave de ação.
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { ok: true, data: parsed as Record<string, unknown> };
    }
  } catch { /* JSON inválido → body vazio, o action check rejeita depois */ }

  return { ok: true, data: {} };
}

export const __testing = { MAX_BODY_BYTES, PLAN_LEVELS, STAFF_ROLES };
