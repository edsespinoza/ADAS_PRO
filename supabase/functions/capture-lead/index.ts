// ADAS PRO — Edge Function: capture-lead
// Recebe as submissões do formulário da landing page (#contactForm)
// e grava em public.leads. Público (sem JWT) por design.
//
// Deploy: supabase functions deploy capture-lead --no-verify-jwt
// Env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL (CORS),
//           LEAD_IP_SALT (hash de IP — LGPD), RESEND_API_KEY + ADMIN_EMAIL (aviso opcional)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE_URL     = Deno.env.get('SITE_URL') || 'https://adaspro.com.br';
const IP_SALT      = Deno.env.get('LEAD_IP_SALT') || 'adaspro-lead-salt-dev';
const RESEND_KEY   = Deno.env.get('RESEND_API_KEY');
const ADMIN_EMAIL  = Deno.env.get('ADMIN_EMAIL') || 'superadmin@adaspro.com.br';

// Origens permitidas para CORS (preview do Vercel fica de fora — igual às outras funções)
const ALLOWED_ORIGINS = ['https://adaspro.com.br', 'http://localhost:3000', 'http://127.0.0.1:3000'];

const VALID_PROFILES = new Set(['tecnico', 'oficina', 'autocenter', 'parabrisa', 'gestor', 'outro']);

const MAX_BODY_BYTES   = 8 * 1024;
const RATE_IP_LIMIT    = 5;             // por janela de 1 min
const RATE_EMAIL_LIMIT = 3;             // por janela de 1 h
const WINDOW_MS        = 60_000;
const HOUR_MS          = 3_600_000;

serve(async (req) => {
  const origin = req.headers.get('origin');

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(origin) });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin);

  // Atalho pelo header; o teto real é aplicado no stream abaixo.
  if (parseInt(req.headers.get('content-length') || '0') > MAX_BODY_BYTES) {
    return json({ error: 'Payload muito grande.' }, 413, origin);
  }

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return json({ error: 'Payload muito grande.' }, 413, origin);
    body = JSON.parse(raw);
    if (!body || typeof body !== 'object') throw new Error('not an object');
  } catch {
    return json({ error: 'JSON inválido.' }, 400, origin);
  }

  // Honeypot — bots preenchem; descarta silenciosamente com 200.
  if (typeof body.company_website === 'string' && body.company_website.trim() !== '') {
    return json({ ok: true }, 200, origin);
  }

  const name    = str(body.name, 120);
  const email   = str(body.email, 254)?.toLowerCase() ?? '';
  const phone   = str(body.phone, 40);
  const profile = str(body.profile, 40) ?? '';
  const message = str(body.message, 500) ?? '';

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!name || name.length < 2)                    return json({ error: 'Informe seu nome completo.' }, 400, origin);
  if (!emailRegex.test(email))                     return json({ error: 'E-mail inválido.' }, 400, origin);
  if (profile && !VALID_PROFILES.has(profile))     return json({ error: 'Perfil inválido.' }, 400, origin);

  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13)    return json({ error: 'WhatsApp inválido.' }, 400, origin);

  /* ─── Rate limit (IP + e-mail) — fail-open ─── */
  const ip = (req.headers.get('x-real-ip')
    || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || 'unknown');
  const ipHash    = await sha256Hex(`${IP_SALT}:${ip}`);
  const emailHash = await sha256Hex(email);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const now = Date.now();

  try {
    const [ipR, emailR] = await Promise.all([
      admin.rpc('increment_rate_limit', {
        p_bucket: `lead:ip:${ipHash}`,
        p_window: new Date(Math.floor(now / WINDOW_MS) * WINDOW_MS).toISOString(),
        p_limit: RATE_IP_LIMIT, p_window_ms: WINDOW_MS,
      }),
      admin.rpc('increment_rate_limit', {
        p_bucket: `lead:email:${emailHash}`,
        p_window: new Date(Math.floor(now / HOUR_MS) * HOUR_MS).toISOString(),
        p_limit: RATE_EMAIL_LIMIT, p_window_ms: HOUR_MS,
      }),
    ]);
    if (typeof ipR.data === 'number' && ipR.data > RATE_IP_LIMIT) {
      return json({ error: 'Muitas solicitações. Tente novamente em 1 minuto.' }, 429, origin);
    }
    if (typeof emailR.data === 'number' && emailR.data > RATE_EMAIL_LIMIT) {
      return json({ error: 'Você já enviou recentemente. Aguarde alguns minutos.' }, 429, origin);
    }
  } catch (e) {
    console.error('[capture-lead] rate limit falhou (fail-open):', e instanceof Error ? e.message : e);
  }

  /* ─── Origem / visitante ─── */
  const tracking = {
    source:       'form',
    utm_source:   str(body.utm_source, 120),
    utm_medium:   str(body.utm_medium, 120),
    utm_campaign: str(body.utm_campaign, 120),
    utm_term:     str(body.utm_term, 120),
    utm_content:  str(body.utm_content, 120),
    referrer:     str(body.referrer, 400),
    landing_page: str(body.landing_page, 200),
    device:       str(body.device, 20),
    user_agent:   str(req.headers.get('user-agent'), 400),
    ip_hash:      ipHash,
  };

  /* ─── Dedup: mesmo e-mail nas últimas 24h → atualiza ─── */
  const { data: existing, error: findErr } = await admin
    .from('leads')
    .select('id')
    .eq('email', email)
    .gte('created_at', new Date(now - 86_400_000).toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findErr) console.error('[capture-lead] select falhou:', findErr.message);

  const payload = { name, phone, profile: profile || null, message: message || null, ...tracking };

  if (existing?.id) {
    const { error } = await admin.from('leads').update(payload).eq('id', existing.id);
    if (error) {
      console.error('[capture-lead] update falhou:', error.message);
      return json({ error: 'Não foi possível registrar. Tente novamente.' }, 500, origin);
    }
    return json({ ok: true, dedup: true }, 200, origin);
  }

  const { error } = await admin.from('leads').insert({ email, ...payload });
  if (error) {
    console.error('[capture-lead] insert falhou:', error.message);
    return json({ error: 'Não foi possível registrar. Tente novamente.' }, 500, origin);
  }

  // Aviso por e-mail ao admin — best-effort, não bloqueia a resposta.
  const mail = sendAdminEmail({ name, email, phone: phone || '', profile, message, tracking });
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(mail);
  else await mail.catch(() => {});

  return json({ ok: true }, 200, origin);
});

// ─── Utilitários ────────────────────────────────────────────────────────────

function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : SITE_URL,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
    'Cache-Control': 'private, no-store',
  };
}

function json(data: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(origin) },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function esc(s: string) {
  return String(s || '').replace(/[<>&"']/g, c =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#x27;' }[c] || c));
}

async function sendAdminEmail(lead: {
  name: string; email: string; phone: string; profile: string; message: string;
  tracking: Record<string, string | null>;
}) {
  if (!RESEND_KEY) return;

  const origem = lead.tracking.utm_source
    ? `UTM: ${lead.tracking.utm_source}${lead.tracking.utm_campaign ? ` / ${lead.tracking.utm_campaign}` : ''}`
    : (lead.tracking.referrer || 'direto');

  const row = (k: string, v: string) => `
    <tr>
      <td style="padding:6px 0;width:120px;vertical-align:top;">
        <span style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:1.5px;color:#9AA0B0;text-transform:uppercase;">${k}</span>
      </td>
      <td style="padding:6px 0;">
        <span style="font-family:Georgia,serif;font-size:14px;color:#1B2B4D;">${esc(v)}</span>
      </td>
    </tr>`;

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"></head>
  <body style="margin:0;padding:0;background:#ECEEF2;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ECEEF2;">
      <tr><td align="center" style="padding:32px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:4px;overflow:hidden;">
          <tr><td style="height:4px;background:#00B4D8;"></td></tr>
          <tr><td style="background:#0D1821;padding:24px 36px;">
            <span style="font-family:Georgia,serif;font-size:20px;font-weight:700;color:#fff;">ADAS <span style="color:#00B4D8;">PRO</span></span>
          </td></tr>
          <tr><td style="padding:32px 36px;">
            <h1 style="margin:0 0 6px;font-family:Georgia,serif;font-size:21px;color:#0D1821;">Novo lead pela landing</h1>
            <p style="margin:0 0 22px;font-family:Georgia,serif;font-size:13px;color:#6B7385;">Recebido em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;border-left:3px solid #00B4D8;border-radius:0 4px 4px 0;">
              <tr><td style="padding:16px 22px;">
                <table role="presentation" width="100%">
                  ${row('NOME', lead.name)}
                  ${row('E-MAIL', lead.email)}
                  ${row('WHATSAPP', lead.phone || '—')}
                  ${row('PERFIL', lead.profile || '—')}
                  ${lead.message ? row('NECESSIDADE', lead.message) : ''}
                  ${row('ORIGEM', origem)}
                  ${row('PÁGINA', lead.tracking.landing_page || '/')}
                  ${row('DISPOSITIVO', lead.tracking.device || '—')}
                </table>
              </td></tr>
            </table>
            <p style="margin:22px 0 0;font-family:'Courier New',monospace;font-size:11px;color:#9AA0B0;">Painel: ${SITE_URL}/admin</p>
          </td></tr>
          <tr><td style="height:3px;background:linear-gradient(90deg,#00B4D8 0%,#0D1821 100%);"></td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'ADAS PRO <noreply@adaspro.com.br>',
        to: ADMIN_EMAIL,
        reply_to: lead.email,
        subject: `[ADAS PRO] Novo lead — ${lead.name}`,
        html,
      }),
    });
    if (!res.ok) console.error('[capture-lead] resend error:', await res.text());
  } catch (e) {
    console.error('[capture-lead] resend exception:', e instanceof Error ? e.message : e);
  }
}
